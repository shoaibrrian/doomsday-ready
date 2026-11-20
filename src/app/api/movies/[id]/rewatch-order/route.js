import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Movie from "@/models/Movie";

// GET: Generate rewatch order
export async function GET(request, context) {
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

    // Get all movies
    const movies = await Movie.find()
      .select("_id title releaseYear runtime watched prerequisites")
      .lean();

    // Create movie lookup map
    const movieMap = new Map();

    for (const movie of movies) {
      movieMap.set(movie._id.toString(), movie);
    }

    // Find target movie
    const targetMovie = movieMap.get(id);

    if (!targetMovie) {
      return NextResponse.json(
        { success: false, message: "Movie not found." },
        { status: 404 },
      );
    }

    // DFS tracking
    const visited = new Set();
    const visiting = new Set();
    const rewatchOrder = [];

    function dfs(movieId) {
      const currentId = movieId.toString();

      // Already processed
      if (visited.has(currentId)) {
        return;
      }

      // Detect unexpected circular dependency
      if (visiting.has(currentId)) {
        throw new Error("CIRCULAR_DEPENDENCY");
      }

      const movie = movieMap.get(currentId);

      // Skip missing references
      if (!movie) {
        return;
      }

      visiting.add(currentId);

      // Visit prerequisites first
      for (const prerequisiteId of movie.prerequisites) {
        dfs(prerequisiteId);
      }

      visiting.delete(currentId);
      visited.add(currentId);

      // Do not include target movie
      if (currentId !== id) {
        rewatchOrder.push(movie);
      }
    }

    // Start DFS from target movie
    dfs(id);

    // Count watched movies
    const watchedCount = rewatchOrder.filter((movie) => movie.watched).length;

    // Calculate unwatched runtime
    const remainingRuntime = rewatchOrder
      .filter((movie) => !movie.watched)
      .reduce((total, movie) => total + movie.runtime, 0);

    // Return result
    return NextResponse.json(
      {
        success: true,
        data: {
          targetMovie: targetMovie.title,
          rewatchOrder: rewatchOrder.map((movie) => ({
            _id: movie._id,
            title: movie.title,
            releaseYear: movie.releaseYear,
            runtime: movie.runtime,
            watched: movie.watched,
          })),
          totalMovies: rewatchOrder.length,
          watchedCount,
          remainingRuntime,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Rewatch Order Error:", error);

    if (error.message === "CIRCULAR_DEPENDENCY") {
      return NextResponse.json(
        {
          success: false,
          error: "CIRCULAR_DEPENDENCY",
          message: "Circular dependency detected.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to generate rewatch order." },
      { status: 500 },
    );
  }
}
