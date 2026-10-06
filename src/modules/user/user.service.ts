import { prisma } from "../../lib/prisma";
import type { UpdateProfileInput } from "./user.validation";

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User account not found");
  }

  return user;
};

export const updateUserProfile = async (userId: string, data: UpdateProfileInput) => {
  // 1. If email is being changed, ensure it's not already used by another account
  if (data.email) {
    const normalizedEmail = data.email.toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new Error("This email is already in use by another account");
    }
  }

  // 2. Perform profile update
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email && { email: data.email.toLowerCase() }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};