import { prisma } from "../../lib/prisma";

export const enrollStudentInGroup = async (
  tutorId: string,
  groupId: string,
  studentId: string
) => {
  // Verify both the student and group belong to this tutor[cite: 6]
  const group = await prisma.group.findFirst({ where: { id: groupId, tutorId } });
  const student = await prisma.student.findFirst({ where: { id: studentId, tutorId } });

  if (!group || !student) throw new Error("Group or Student not found");

  const enrollment = await prisma.groupStudent.create({
    data: {
      groupId,
      studentId,
    },
  });

  return enrollment;
};

export const unenrollStudentFromGroup = async (
  tutorId: string,
  groupId: string,
  studentId: string
) => {
  // Verify the group belongs to this tutor before deleting[cite: 6]
  const group = await prisma.group.findFirst({ where: { id: groupId, tutorId } });
  if (!group) throw new Error("Group not found");

  await prisma.groupStudent.delete({
    where: {
      groupId_studentId: { groupId, studentId }, // Using the compound unique key[cite: 6]
    },
  });
};