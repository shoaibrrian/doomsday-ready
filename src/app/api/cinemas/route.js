import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Cinema from "@/models/Cinema";

// POST: Create a cinema
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const { name, bundleSizes } = body;

    // Validate name
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Cinema name is required." },
        { status: 400 },
      );
    }

    // Validate bundle sizes
    if (
      !Array.isArray(bundleSizes) ||
      bundleSizes.length < 1 ||
      bundleSizes.length > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide 1 to 10 bundle sizes.",
        },
        { status: 400 },
      );
    }

    // Validate individual bundle sizes
    if (
      !bundleSizes.every(
        (size) => Number.isInteger(size) && size >= 1 && size <= 500,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Each bundle size must be between 1 and 500.",
        },
        { status: 400 },
      );
    }

    // Check duplicate bundle sizes
    if (new Set(bundleSizes).size !== bundleSizes.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate bundle sizes are not allowed.",
        },
        { status: 400 },
      );
    }

    // Create cinema
    const cinema = await Cinema.create({
      name: name.trim(),
      bundleSizes,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cinema created successfully.",
        data: cinema,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Cinema Error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A cinema with this name already exists.",
        },
        { status: 409 },
      );
    }

    if (error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create cinema." },
      { status: 500 },
    );
  }
}

// GET: List all cinemas
export async function GET() {
  try {
    await connectDB();

    const cinemas = await Cinema.find().sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: cinemas.length,
        data: cinemas,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET Cinemas Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch cinemas." },
      { status: 500 },
    );
  }
}
