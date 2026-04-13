import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { getCached } from "@/lib/cache";
import { logActivity } from "@/lib/activity-log";
import { sendTemplateEmail } from "@/lib/email";

// GET /api/admin/users - List users with pagination
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const search = searchParams.get("search")?.toLowerCase() || "";
    const filter = searchParams.get("filter") || "all"; // all | admins | users | disabled

    // 1. Get all Firebase Auth users (the source of truth for accounts)
    const authUsers: Array<{
      uid: string;
      email: string;
      displayName: string;
      disabled: boolean;
      creationTime: string;
      lastSignInTime: string;
      provider: string;
    }> = [];
    let pageToken: string | undefined;
    do {
      const listResult = await adminAuth.listUsers(1000, pageToken);
      for (const u of listResult.users) {
        const mainProvider = u.providerData[0]?.providerId || "password";
        authUsers.push({
          uid: u.uid,
          email: u.email || "",
          displayName: u.displayName || "",
          disabled: u.disabled,
          creationTime: u.metadata.creationTime || "",
          lastSignInTime: u.metadata.lastSignInTime || "",
          provider: mainProvider === "google.com" ? "google" : "email",
        });
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    // 2. Get all Firestore user docs (role info, extra metadata)
    const firestoreMap: Record<string, Record<string, unknown>> = {};
    try {
      const usersSnap = await adminDb.collection("users").get();
      for (const doc of usersSnap.docs) {
        firestoreMap[doc.id] = doc.data();
      }
    } catch {
      // Firestore may be empty or unavailable
    }

    // 3. Get purchase counts (cached for 2 minutes)
    const purchaseCounts = await getCached<Record<string, number>>(
      "admin:purchaseCounts",
      120,
      async () => {
        const counts: Record<string, number> = {};
        try {
          const purchasesSnap = await adminDb
            .collection("purchases")
            .where("status", "==", "completed")
            .get();
          for (const doc of purchasesSnap.docs) {
            const data = doc.data();
            const userId = data.userId;
            if (userId) {
              counts[userId] = (counts[userId] || 0) + 1;
            }
          }
        } catch { /* No purchases collection */ }
        return counts;
      }
    );

    // 4. Merge: Auth is primary, Firestore supplements
    let users = authUsers.map((authUser) => {
      const fsData = firestoreMap[authUser.uid] || {};
      return {
        id: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || (fsData.displayName as string) || "",
        role: (fsData.role as string) || "user",
        disabled: authUser.disabled,
        provider: authUser.provider,
        purchaseCount: purchaseCounts[authUser.uid] || 0,
        createdAt: authUser.creationTime || (fsData.createdAt as string) || "",
        lastSignIn: authUser.lastSignInTime || "",
      };
    });

    // Sort by creation date descending
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Apply filters
    if (filter === "admins") users = users.filter((u) => u.role === "admin");
    else if (filter === "users") users = users.filter((u) => u.role === "user");
    else if (filter === "disabled") users = users.filter((u) => u.disabled);

    // 6. Apply search
    if (search) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.displayName.toLowerCase().includes(search)
      );
    }

    // Stats (before pagination)
    const total = users.length;
    const admins = authUsers.filter((u) => (firestoreMap[u.uid]?.role || "user") === "admin").length;
    const disabled = authUsers.filter((u) => u.disabled).length;

    // 7. Paginate
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedUsers = users.slice(offset, offset + limit);

    // 8. Sync missing Firestore docs (only for current page to limit writes)
    const batch = adminDb.batch();
    let batchCount = 0;
    for (const u of paginatedUsers) {
      if (!firestoreMap[u.id]) {
        batch.set(adminDb.collection("users").doc(u.id), {
          uid: u.id,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          createdAt: u.createdAt || new Date().toISOString(),
        }, { merge: true });
        batchCount++;
      }
    }
    if (batchCount > 0) {
      try { await batch.commit(); } catch { /* best effort */ }
    }

    return NextResponse.json({
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
      admins,
      disabled,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - Update user role, status, ban, or suspend
export async function PATCH(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { userId, role, disabled, bannedReason, suspendedUntil } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const adminId = adminUser?.uid || "admin";

    // Update role
    if (role && ["user", "admin"].includes(role)) {
      await adminDb.collection("users").doc(userId).set({ role }, { merge: true });
      logActivity({ action: "user.role_changed", userId: adminId, targetId: userId, details: `Role changed to ${role}` });
    }

    // Enable/disable user in Firebase Auth
    if (typeof disabled === "boolean") {
      await adminAuth.updateUser(userId, { disabled });
      if (disabled && bannedReason) {
        await adminDb.collection("users").doc(userId).set(
          { bannedReason, bannedAt: new Date().toISOString() },
          { merge: true }
        );
        logActivity({ action: "user.banned", userId: adminId, targetId: userId, details: bannedReason });
        try {
          const ud = await adminDb.collection("users").doc(userId).get();
          if (ud.exists && ud.data()?.email) {
            sendTemplateEmail("account_disabled", ud.data()!.email, {
              name: ud.data()!.displayName || ud.data()!.email,
              reason: bannedReason,
            }).catch(() => {});
          }
        } catch { /* non-blocking */ }
      } else if (disabled) {
        logActivity({ action: "user.disabled", userId: adminId, targetId: userId });
        try {
          const ud = await adminDb.collection("users").doc(userId).get();
          if (ud.exists && ud.data()?.email) {
            sendTemplateEmail("account_disabled", ud.data()!.email, {
              name: ud.data()!.displayName || ud.data()!.email,
              reason: "Your account has been disabled by an administrator.",
            }).catch(() => {});
          }
        } catch { /* non-blocking */ }
      }
      if (!disabled) {
        await adminDb.collection("users").doc(userId).update({
          bannedReason: "",
          bannedAt: "",
          suspendedUntil: "",
        });
        logActivity({ action: "user.enabled", userId: adminId, targetId: userId });
      }
    }

    // Suspend temporarily
    if (suspendedUntil) {
      await adminAuth.updateUser(userId, { disabled: true });
      await adminDb.collection("users").doc(userId).set(
        { suspendedUntil, suspendedAt: new Date().toISOString() },
        { merge: true }
      );
      logActivity({ action: "user.suspended", userId: adminId, targetId: userId, details: `Until ${suspendedUntil}` });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users - Delete user and cleanup all related data
export async function DELETE(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    let userEmail = userId;
    try { const u = await adminAuth.getUser(userId); userEmail = u.email || userId; } catch { /* ok */ }

    // 1. Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(userId);
    } catch (authErr) {
      console.error("Error deleting auth user:", authErr);
    }

    // 2. Delete Firestore user doc
    try {
      await adminDb.collection("users").doc(userId).delete();
    } catch { /* may not exist */ }

    // 3. Delete user's purchases
    try {
      const purchasesSnap = await adminDb
        .collection("purchases")
        .where("userId", "==", userId)
        .get();
      const batch = adminDb.batch();
      purchasesSnap.docs.forEach((doc) => batch.delete(doc.ref));
      if (purchasesSnap.docs.length > 0) await batch.commit();
    } catch { /* best effort */ }

    // 4. Delete user's subscriptions
    try {
      const subsSnap = await adminDb
        .collection("subscriptions")
        .where("userId", "==", userId)
        .get();
      const batch = adminDb.batch();
      subsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      if (subsSnap.docs.length > 0) await batch.commit();
    } catch { /* best effort */ }

    // 5. Delete user's alerts
    try {
      const alertsSnap = await adminDb
        .collection("alerts")
        .where("userId", "==", userId)
        .get();
      const batch = adminDb.batch();
      alertsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      if (alertsSnap.docs.length > 0) await batch.commit();
    } catch { /* best effort */ }

    logActivity({ action: "user.deleted", userId: adminUser?.uid || "admin", targetId: userId, details: `Deleted user ${userEmail}` });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
