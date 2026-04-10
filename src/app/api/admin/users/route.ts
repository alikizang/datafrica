import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

// GET /api/admin/users - List all users (merged Firebase Auth + Firestore)
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

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

    // 3. Get purchase counts per user
    const purchaseCounts: Record<string, number> = {};
    try {
      const purchasesSnap = await adminDb
        .collection("purchases")
        .where("status", "==", "completed")
        .get();
      for (const doc of purchasesSnap.docs) {
        const data = doc.data();
        const userId = data.userId;
        if (userId) {
          purchaseCounts[userId] = (purchaseCounts[userId] || 0) + 1;
        }
      }
    } catch {
      // No purchases collection
    }

    // 4. Merge: Auth is primary, Firestore supplements
    const users = authUsers.map((authUser) => {
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

    // 5. Sync missing Firestore docs (users in Auth but not in Firestore)
    const batch = adminDb.batch();
    let batchCount = 0;
    for (const u of users) {
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
      users,
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      disabled: users.filter((u) => u.disabled).length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - Update user role or status
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { userId, role, disabled } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Update role
    if (role && ["user", "admin"].includes(role)) {
      await adminDb.collection("users").doc(userId).set({ role }, { merge: true });
    }

    // Enable/disable user in Firebase Auth
    if (typeof disabled === "boolean") {
      await adminAuth.updateUser(userId, { disabled });
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
