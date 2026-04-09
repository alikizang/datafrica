import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { Dataset } from "@/types";

// GET /api/datasets - List datasets with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const country = searchParams.get("country");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: FirebaseFirestore.Query = adminDb.collection("datasets");

    if (category) {
      query = query.where("category", "==", category);
    }
    if (country) {
      query = query.where("country", "==", country);
    }
    if (featured === "true") {
      query = query.where("featured", "==", true);
    }

    query = query.orderBy("createdAt", "desc").limit(limit);

    const snapshot = await query.get();
    let datasets: Dataset[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Dataset[];

    // Client-side filtering for price range and search (Firestore doesn't support range on multiple fields easily)
    if (minPrice) {
      datasets = datasets.filter((d) => d.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      datasets = datasets.filter((d) => d.price <= parseFloat(maxPrice));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      datasets = datasets.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.description.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}
