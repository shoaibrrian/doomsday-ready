import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    releaseYear: {
      type: Number,
      required: true,
      min: 1,
    },

    runtime: {
      type: Number,
      required: true,
      min: 1,
      max: 300,
    },

    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie",
      },
    ],

    watched: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);

export default Movie;
