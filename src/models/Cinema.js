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
      validate: {
        validator: function (sizes) {
          return (
            sizes.length >= 1 &&
            sizes.length <= 10 &&
            sizes.every(
              (size) => Number.isInteger(size) && size >= 1 && size <= 500,
            ) &&
            new Set(sizes).size === sizes.length
          );
        },
        message: "Invalid cinema bundle sizes.",
      },
    },
  },
  {
    timestamps: true,
  },
);

const Cinema = mongoose.models.Cinema || mongoose.model("Cinema", cinemaSchema);

export default Cinema;
