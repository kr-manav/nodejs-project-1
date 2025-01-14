import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();

        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            refreshToken,
            accessToken,
        };
    } catch (error) {
        throw new ApiError(
            500,
            "something went wrong while generating access and refresh tokens"
        );
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;
    // if(fullname == "" ){
    //     throw new ApiError(400, "FullName is required");
    // }

    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new ApiError(400, "user with same username or email exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImgLocalPath = req.files.coverImage
        ? req.files?.coverImage[0]?.path
        : "";

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const uploadedAvatarImg = await uploadOnCloudinary(avatarLocalPath);
    const uploadedCoverImg = coverImgLocalPath
        ? await uploadOnCloudinary(coverImgLocalPath)
        : "";

    const user = await User.create({
        fullname,
        avatar: uploadedAvatarImg,
        coverImage: uploadedCoverImg,
        email: email.toLowerCase(),
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while register");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "user registered successfully")
        );
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Please enter username or email");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    }).select();

    if (!existingUser) {
        throw new ApiError(400, "user does not exists");
    }

    const isCorrectPassword = existingUser.isCorrectPassword(password);

    if (!isCorrectPassword) {
        throw new ApiError(400, "incorrect password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        existingUser._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    ...existingUser,
                    accessToken,
                    refreshToken,
                },
                "user registered successfully"
            )
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    if (!user) {
        throw new ApiError(400, "Invalid user id");
    }

    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
        throw new ApiError(401, "Invalid token requested");
    }

    const decodedData = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedData._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== token) {
        throw new ApiError(401, "Invalid user requested");
    }

    const options = {
        httpOnly: true,
        secure: true,
    };

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Refresh token generated successfully"
            )
        );
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { newPassword, oldPassword } = req.body;

    const user = req.user;

    const existingUser = await User.findById(user._id).select("password");

    if (!existingUser.isCorrectPassword(oldPassword)) {
        throw new ApiError(401, "Invalid credentials");
    }

    existingUser.password = newPassword;
    existingUser.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).json(
        new ApiResponse(200, req.user, "User fetchd successfully")
    );
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    res.status(200).json(
        new ApiResponse(200, user, "User updated successfully")
    );
});

export const updateAccountAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath =
        req.files && req.files.avatar && req.files.avatar.length > 0
            ? req.files?.avatar[0]?.path
            : "";

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const uploadedAvatarPath = await uploadOnCloudinary(avatarLocalPath);

    if (!uploadedAvatarPath) {
        throw new ApiError(400, "Error while uploading file to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: uploadedAvatarPath,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    );
});

export const updateAccountCoverImg = asyncHandler(async (req, res) => {
    const coverImgLocalPath =
        req.files && req.files.coverImage && req.files.coverImage.length > 0
            ? req.files?.coverImage[0]?.path
            : "";

    if (!coverImgLocalPath) {
        throw new ApiError(400, "cover img file is required");
    }

    const uploadedCoverImg = await uploadOnCloudinary(coverImgLocalPath);

    if (!uploadedCoverImg) {
        throw new ApiError(400, "Error while uploading file to cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: uploadedCoverImg,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    res.status(200).json(
        new ApiResponse(200, user, "User cover img updated successfully")
    );
});

export const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (channel.length == 0) {
        throw new ApiError(400, "Channel not fetched");
    }

    res.status(200).json(
        new ApiResponse(200, channel[0], "Channel data fetched successfully")
    );
});

export const getUserWatchHistory = asyncHandler(async (req, res) => {
    const userWatchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistorty",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    if (userWatchHistory.length == 0) {
        throw new ApiError(400, "No watch history found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            userWatchHistory[0],
            "Watch history fetched successfully"
        )
    );
});
