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

    // Fetch all datasets ordered by createdAt, then filter in JS.
    // This avoids needing composite Firestore indexes for every
    // filter combination (category+createdAt, country+createdAt, etc.)
    const snapshot = await adminDb
      .collection("datasets")
      .orderBy("createdAt", "desc")
      .get();

    let datasets: Dataset[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Dataset[];

    if (category) {
      datasets = datasets.filter((d) => d.category === category);
    }
    if (country) {
      datasets = datasets.filter((d) => d.country === country);
    }
    if (featured === "true") {
      datasets = datasets.filter((d) => d.featured === true);
    }
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

    datasets = datasets.slice(0, limit);

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}
