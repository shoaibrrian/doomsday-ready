import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Cinema from "@/models/Cinema";

// GET: Generate booking quote
export async function GET(request, context) {
  try {
    await connectDB();

    const { id } = await context.params;

    // Validate cinema ID
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid cinema ID." },
        { status: 400 },
      );
    }

    // Validate group size
    const { searchParams } = new URL(request.url);
    const groupSize = Number(searchParams.get("groupSize"));

    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Group size must be between 1 and 10000.",
        },
        { status: 400 },
      );
    }

    // Find cinema
    const cinema = await Cinema.findById(id);

    if (!cinema) {
      return NextResponse.json(
        { success: false, message: "Cinema not found." },
        { status: 404 },
      );
    }

    const bundleSizes = cinema.bundleSizes;

    // Dynamic Programming arrays
    const dp = new Array(groupSize + 1).fill(Infinity);
    const lastBundle = new Array(groupSize + 1).fill(0);

    // Zero seats require zero bundles
    dp[0] = 0;

    // Calculate minimum bundles
    for (let amount = 1; amount <= groupSize; amount++) {
      for (const size of bundleSizes) {
        if (size <= amount && dp[amount - size] !== Infinity) {
          const newCount = dp[amount - size] + 1;

          if (newCount < dp[amount]) {
            dp[amount] = newCount;
            lastBundle[amount] = size;
          }
        }
      }
    }

    // Check if exact combination exists
    if (dp[groupSize] === Infinity) {
      return NextResponse.json(
        {
          success: true,
          possible: false,
          message: "Not possible to book exact group size.",
          data: {
            cinema: cinema.name,
            groupSize,
            bundleSizes,
          },
        },
        { status: 200 },
      );
    }

    // Reconstruct bundle combination
    const bundleCounts = {};

    let remaining = groupSize;

    while (remaining > 0) {
      const size = lastBundle[remaining];

      if (size === 0) {
        throw new Error("Booking calculation failed.");
      }

      bundleCounts[size] = (bundleCounts[size] || 0) + 1;

      remaining -= size;
    }

    // Format bundle result
    const bundles = Object.entries(bundleCounts)
      .map(([size, count]) => ({
        size: Number(size),
        count,
      }))
      .sort((a, b) => b.size - a.size);

    return NextResponse.json(
      {
        success: true,
        possible: true,
        data: {
          cinema: cinema.name,
          groupSize,
          totalBundles: dp[groupSize],
          bundles,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Booking Quote Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate booking quote.",
      },
      { status: 500 },
    );
  }
}
