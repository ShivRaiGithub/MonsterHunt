import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    userId: {
      account: { type: String, required: true, sparse: true },
      platform: {
        type: String,
        required: true,
      },
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    huntTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    wins: {
        villager : {type: Number, default: 0, min: 0},
        doctor : {type: Number, default: 0, min: 0},
        sheriff : {type: Number, default: 0, min: 0},
        werewolf : {type: Number, default: 0, min: 0},
        vampire : {type: Number, default: 0, min: 0},
    },
    monsterGenes: {
        werewolf: { type: Boolean, default: true },
        vampire: { type: Boolean, default: false }
    },

    scenesBought: {
      village : { type: Boolean, default: true },
      castle : { type: Boolean, default: false }
    }
    }
  );

userSchema.pre("validate", function (next) {
  if (!this.userId || !this.userId.account || !this.userId.platform) {
    if (typeof next === "function") {
      next(new Error("User must have an account and its platform"));
    }
  } else {
    if (typeof next === "function") {
      next();
    }
  }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
