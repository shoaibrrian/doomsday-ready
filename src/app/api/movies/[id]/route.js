import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Movie from "@/models/Movie";

// Check whether a path exists from one movie to another
function hasPath(startId, targetId, graph, visited = new Set()) {
  if (startId === targetId) {
    return true;
  }

  if (visited.has(startId)) {
    return false;
  }

  visited.add(startId);

  const prerequisites = graph.get(startId) || [];

  for (const prerequisiteId of prerequisites) {
    if (hasPath(prerequisiteId, targetId, graph, visited)) {
      return true;
    }
  }

  return false;
}

// PATCH: Update a movie
export async function PATCH(request, context) {
  try {
    await connectDB();

    const { id } = await context.params;

    // Validate movie ID
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid movie ID." },
        { status: 400 },
      );
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return NextResponse.json(
        { success: false, message: "Movie not found." },
        { status: 404 },
      );
    }

    const body = await request.json();

    const allowedFields = [
      "title",
      "releaseYear",
      "runtime",
      "prerequisites",
      "watched",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(body, field)) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided." },
        { status: 400 },
      );
    }

    // Validate title
    if (Object.hasOwn(updates, "title")) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        return NextResponse.json(
          { success: false, message: "Invalid title." },
          { status: 400 },
        );
      }

      updates.title = updates.title.trim();
    }

    // Validate release year
    if (Object.hasOwn(updates, "releaseYear")) {
      if (!Number.isInteger(updates.releaseYear) || updates.releaseYear < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid release year." },
          { status: 400 },
        );
      }
    }

    // Validate runtime
    if (Object.hasOwn(updates, "runtime")) {
      if (
        !Number.isInteger(updates.runtime) ||
        updates.runtime < 1 ||
        updates.runtime > 300
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid runtime." },
          { status: 400 },
        );
      }
    }

    // Validate watched
    if (Object.hasOwn(updates, "watched")) {
      if (typeof updates.watched !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Watched must be a boolean." },
          { status: 400 },
        );
      }
    }

    // Validate prerequisites
    if (Object.hasOwn(updates, "prerequisites")) {
      const prerequisites = updates.prerequisites;

      if (
        !Array.isArray(prerequisites) ||
        !prerequisites.every(
          (item) => typeof item === "string" && mongoose.isValidObjectId(item),
        )
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid prerequisites." },
          { status: 400 },
        );
      }

      if (new Set(prerequisites).size !== prerequisites.length) {
        return NextResponse.json(
          { success: false, message: "Duplicate prerequisites." },
          { status: 400 },
        );
      }

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

      // Build dependency graph
      const allMovies = await Movie.find().select("_id prerequisites").lean();

      const graph = new Map();

      for (const item of allMovies) {
        graph.set(
          item._id.toString(),
          item.prerequisites.map((p) => p.toString()),
        );
      }

      // Apply proposed prerequisites
      graph.set(id, prerequisites);

      // Check for circular dependency
      for (const prerequisiteId of prerequisites) {
        if (hasPath(prerequisiteId, id, graph)) {
          return NextResponse.json(
            {
              success: false,
              error: "CIRCULAR_DEPENDENCY",
              message: "This update creates a circular dependency.",
            },
            { status: 409 },
          );
        }
      }
    }

    // Apply updates
    Object.assign(movie, updates);

    await movie.save();

    return NextResponse.json(
      {
        success: true,
        message: "Movie updated successfully.",
        data: movie,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH Movie Error:", error);

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
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update movie." },
      { status: 500 },
    );
  }
}
