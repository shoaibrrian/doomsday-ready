import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Movie from "@/models/Movie";

// GET: Get all movies
export async function GET() {
  try {
    await connectDB();

    const movies = await Movie.find()
      .populate("prerequisites", "title releaseYear")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: movies.length,
        data: movies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET Movies Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch movies.",
      },
      { status: 500 },
    );
  }
}

// POST: Create a new movie
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      title,
      releaseYear,
      runtime,
      prerequisites = [],
      watched = false,
    } = body;

    // Required field validation
    if (
      typeof title !== "string" ||
      !title.trim() ||
      releaseYear === undefined ||
      runtime === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Title, releaseYear and runtime are required.",
        },
        { status: 400 },
      );
    }

    // Number validation
    if (
      !Number.isInteger(releaseYear) ||
      releaseYear < 1 ||
      !Number.isInteger(runtime) ||
      runtime < 1 ||
      runtime > 300
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid releaseYear or runtime.",
        },
        { status: 400 },
      );
    }

    // Prerequisites validation
    if (
      !Array.isArray(prerequisites) ||
      !prerequisites.every(
        (id) => typeof id === "string" && mongoose.isValidObjectId(id),
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid prerequisites.",
        },
        { status: 400 },
      );
    }

    // Prevent duplicate prerequisite IDs
    if (new Set(prerequisites).size !== prerequisites.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate prerequisites are not allowed.",
        },
        { status: 400 },
      );
    }

    // Watched validation
    if (typeof watched !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Watched must be a boolean.",
        },
        { status: 400 },
      );
    }

    // Check prerequisite movies exist
    if (prerequisites.length > 0) {
      const existingMovies = await Movie.find({
        _id: { $in: prerequisites },
      }).select("_id");

      if (existingMovies.length !== prerequisites.length) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more prerequisite movies do not exist.",
          },
          { status: 400 },
        );
      }
    }

    // Create movie
    const movie = await Movie.create({
      title: title.trim(),
      releaseYear,
      runtime,
      prerequisites,
      watched,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Movie created successfully.",
        data: movie,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Movie Error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A movie with this title already exists.",
        },
        { status: 409 },
      );
    }

    if (error.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create movie.",
      },
      { status: 500 },
    );
  }
}
