import mongoose from "mongoose";

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    bundleSizes: {
      type: [Number],
      required: true,
      validate: [
        {
          validator: function (sizes) {
            return sizes.length >= 1 && sizes.length <= 10;
          },
          message: "A cinema must have 1 to 10 bundle sizes.",
        },
        {
          validator: function (sizes) {
            return sizes.every(
              (size) => Number.isInteger(size) && size >= 1 && size <= 500,
            );
          },
          message: "Each bundle size must be between 1 and 500.",
        },
        {
          validator: function (sizes) {
            return new Set(sizes).size === sizes.length;
          },
          message: "Duplicate bundle sizes are not allowed.",
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

const Cinema = mongoose.models.Cinema || mongoose.model("Cinema", cinemaSchema);

export default Cinema;
