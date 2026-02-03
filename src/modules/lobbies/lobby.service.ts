import { Types } from "mongoose"
import { Lobby } from "./lobby.model"
import { LobbyMember } from "./lobbyMember.model"
import { Transaction } from "../transactions/transaction.model"

interface CreateLobbyInput {
  name: string
  initialDeposit?: number
  userId: string
}

const createLobby = async ({
  name,
  initialDeposit = 0,
  userId,
}: CreateLobbyInput) => {
  const leaderId = new Types.ObjectId(userId)

  // 1. Create lobby
  const lobby = await Lobby.create({
    name,
    leaderId,
    initialDeposit,
    totalBalance: initialDeposit,
  })

  // 2. Add leader as first member
  await LobbyMember.create({
    lobbyId: lobby._id,
    userId: leaderId,
    totalDeposited: initialDeposit,
    individualBalance: initialDeposit,
  })

  // 3. Create initial deposit transaction (if > 0)
  if (initialDeposit > 0) {
    await Transaction.create({
      lobbyId: lobby._id,
      createdBy: leaderId,
      type: "deposit",
      description: "Initial deposit",
      totalAmount: initialDeposit,
    })
  }

  return {
    lobbyId: lobby._id,
  }
};

const getUserLobbies = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId)

  /**
   * Find lobbies where:
   * - user is leader
   * - OR user is a member
   */
  const lobbies = await Lobby.aggregate([
    {
      $match: {
        $or: [
          { leaderId: userObjectId },
          { _id: { $in: await LobbyMember.distinct("lobbyId", { userId: userObjectId }) } },
        ],
      },
    },

    // Leader info
    {
      $lookup: {
        from: "users",
        localField: "leaderId",
        foreignField: "_id",
        as: "leader",
      },
    },
    { $unwind: "$leader" },

    // Sanitize leader fields (remove sensitive fields)
    {
      $addFields: {
        leader: {
          _id: "$leader._id",
          email: "$leader.email",
          name: "$leader.name",
          createdAt: "$leader.createdAt",
          bio: "$leader.bio",
          age: "$leader.age",
          profilePictureUrl: "$leader.profilePictureUrl",
        },
      },
    },

    // Sanitize leader fields (remove sensitive fields)
    {
      $addFields: {
        leader: {
          _id: "$leader._id",
          email: "$leader.email",
          name: "$leader.name",
          createdAt: "$leader.createdAt",
          bio: "$leader.bio",
          age: "$leader.age",
          profilePictureUrl: "$leader.profilePictureUrl",
        },
      },
    },
    // Members
    {
      $lookup: {
        from: "lobbymembers",
        localField: "_id",
        foreignField: "lobbyId",
        as: "members",
      },
    },

    // Populate member.user
    {
      $lookup: {
        from: "users",
        localField: "members.userId",
        foreignField: "_id",
        as: "memberUsers",
      },
    },

    // Sanitize memberUsers array to avoid leaking sensitive fields
    {
      $addFields: {
        memberUsers: {
          $map: {
            input: "$memberUsers",
            as: "u",
            in: {
              _id: "$$u._id",
              email: "$$u.email",
              name: "$$u.name",
              createdAt: "$$u.createdAt",
              bio: "$$u.bio",
              age: "$$u.age",
              profilePictureUrl: "$$u.profilePictureUrl",
            },
          },
        },
      },
    },
    // Attach user object to each member
    {
      $addFields: {
        members: {
          $map: {
            input: "$members",
            as: "member",
            in: {
              $mergeObjects: [
                "$$member",
                {
                  user: {
                    $arrayElemAt: [
                      "$memberUsers",
                      {
                        $indexOfArray: ["$memberUsers._id", "$$member.userId"],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Member count
    {
      $addFields: {
        memberCount: { $size: "$members" },
      },
    },

    // Sort newest first
    {
      $sort: { createdAt: -1 },
    },

    // Cleanup
    {
      $project: {
        memberUsers: 0,
      },
    },
  ])

  /**
   * Normalize numeric fields (Prisma Decimal equivalent)
   */
  return lobbies.map((lobby) => ({
    ...lobby,
    totalBalance: Number(lobby.totalBalance),
    initialDeposit: Number(lobby.initialDeposit),
    members: lobby.members.map((member: any) => ({
      ...member,
      individualBalance: Number(member.individualBalance),
      totalDeposited: Number(member.totalDeposited),
    })),
  }))
};


const getLobbyDetails = async (
  lobbyId: string,
  userId: string
) => {
  const lobbyObjectId = new Types.ObjectId(lobbyId)
  const userObjectId = new Types.ObjectId(userId)

  /**
   * Fetch lobby with:
   * - leader
   * - members (with user, ordered by joinedAt)
   * - transactions (with creator + details.user)
   */
  const lobbyAgg = await Lobby.aggregate([
    { $match: { _id: lobbyObjectId } },

    // Leader
    {
      $lookup: {
        from: "users",
        localField: "leaderId",
        foreignField: "_id",
        as: "leader",
      },
    },
    { $unwind: "$leader" },

    // Members
    {
      $lookup: {
        from: "lobbymembers",
        localField: "_id",
        foreignField: "lobbyId",
        as: "members",
      },
    },
    { $unwind: { path: "$members", preserveNullAndEmptyArrays: true } },

    // Member user
    {
      $lookup: {
        from: "users",
        localField: "members.userId",
        foreignField: "_id",
        as: "memberUser",
      },
    },
    // Sanitize memberUser array to avoid leaking sensitive fields
    {
      $addFields: {
        memberUser: {
          $map: {
            input: "$memberUser",
            as: "u",
            in: {
              _id: "$$u._id",
              email: "$$u.email",
              name: "$$u.name",
              createdAt: "$$u.createdAt",
              bio: "$$u.bio",
              age: "$$u.age",
              profilePictureUrl: "$$u.profilePictureUrl",
            },
          },
        },
      },
    },
    {
      $addFields: {
        "members.user": { $arrayElemAt: ["$memberUser", 0] },
      },
    },

    // Restore members array + order by joinedAt
    {
      $group: {
        _id: "$_id",
        lobby: { $first: "$$ROOT" },
        members: { $push: "$members" },
      },
    },
    {
      $addFields: {
        "lobby.members": {
          $sortArray: {
            input: "$members",
            sortBy: { joinedAt: 1 },
          },
        },
      },
    },

    { $replaceRoot: { newRoot: "$lobby" } },

    // Transactions
    {
      $lookup: {
        from: "transactions",
        localField: "_id",
        foreignField: "lobbyId",
        as: "transactions",
      },
    },
    { $unwind: { path: "$transactions", preserveNullAndEmptyArrays: true } },

    // Transaction creator
    {
      $lookup: {
        from: "users",
        localField: "transactions.createdBy",
        foreignField: "_id",
        as: "transactionCreator",
      },
    },
    // Sanitize transactionCreator array
    {
      $addFields: {
        transactionCreator: {
          $map: {
            input: "$transactionCreator",
            as: "u",
            in: {
              _id: "$$u._id",
              email: "$$u.email",
              name: "$$u.name",
              createdAt: "$$u.createdAt",
              bio: "$$u.bio",
              age: "$$u.age",
              profilePictureUrl: "$$u.profilePictureUrl",
            },
          },
        },
      },
    },
    {
      $addFields: {
        "transactions.creator": {
          $arrayElemAt: ["$transactionCreator", 0],
        },
      },
    },

    // Transaction details
    {
      $lookup: {
        from: "transactiondetails",
        localField: "transactions._id",
        foreignField: "transactionId",
        as: "transactionDetails",
      },
    },

    // Detail user
    {
      $lookup: {
        from: "users",
        localField: "transactionDetails.userId",
        foreignField: "_id",
        as: "detailUsers",
      },
    },

    // Sanitize detailUsers array
    {
      $addFields: {
        detailUsers: {
          $map: {
            input: "$detailUsers",
            as: "u",
            in: {
              _id: "$$u._id",
              email: "$$u.email",
              name: "$$u.name",
              createdAt: "$$u.createdAt",
              bio: "$$u.bio",
              age: "$$u.age",
              profilePictureUrl: "$$u.profilePictureUrl",
            },
          },
        },
      },
    },

    {
      $addFields: {
        "transactions.details": {
          $map: {
            input: "$transactionDetails",
            as: "detail",
            in: {
              $mergeObjects: [
                "$$detail",
                {
                  user: {
                    $arrayElemAt: [
                      "$detailUsers",
                      {
                        $indexOfArray: [
                          "$detailUsers._id",
                          "$$detail.userId",
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Re-group transactions
    {
      $group: {
        _id: "$_id",
        lobby: { $first: "$$ROOT" },
        transactions: { $push: "$transactions" },
      },
    },
    {
      $addFields: {
        "lobby.transactions": {
          $sortArray: {
            input: "$transactions",
            sortBy: { createdAt: -1 },
          },
        },
      },
    },

    { $replaceRoot: { newRoot: "$lobby" } },

    {
      $project: {
        memberUser: 0,
        transactionCreator: 0,
        transactionDetails: 0,
        detailUsers: 0,
      },
    },
  ])

  if (!lobbyAgg.length) {
    return null
  }

  const lobby = lobbyAgg[0]

  /**
   * Normalize numeric fields (Prisma Decimal parity)
   */
  lobby.totalBalance = Number(lobby.totalBalance)
  lobby.initialDeposit = Number(lobby.initialDeposit)

  lobby.members = lobby.members.map((m: any) => ({
    ...m,
    individualBalance: Number(m.individualBalance),
    totalDeposited: Number(m.totalDeposited),
  }))

  lobby.transactions = lobby.transactions.map((t: any) => ({
    ...t,
    totalAmount: Number(t.totalAmount),
    details:
      t.details?.map((d: any) => ({
        ...d,
        amount: Number(d.amount),
      })) || [],
  }))

  /**
   * Membership checks
   */
  const isMember = lobby.members.some(
    (m: any) => String(m.userId) === String(userObjectId)
  )
  const isLeader = String(lobby.leaderId) === String(userObjectId)

  if (!isMember) {
    return { forbidden: true }
  }

  /**
   * Calculate balances (EXACT same logic)
   */
  const memberBalances = lobby.members.map((member: any) => {
    const totalExpenses = lobby.transactions
      .filter((t: any) => t.type !== "deposit")
      .reduce((sum: number, transaction: any) => {
        if (transaction.type === "expense_equal") {
          return sum + transaction.totalAmount / lobby.members.length
        }

        if (transaction.type === "expense_individual") {
          const detail = transaction.details?.find(
            (d: any) =>
              String(d.userId) === String(member.userId)
          )
          return sum + (detail ? detail.amount : 0)
        }

        return sum
      }, 0)

    const balance = member.totalDeposited - totalExpenses
    const owes = balance < 0 ? Math.abs(balance) : 0

    return {
      ...member,
      calculatedBalance: balance,
      totalExpenses,
      owes,
    }
  })

  return {
    lobby,
    memberBalances,
    isLeader,
  }
};

export const lobbyService = {
    createLobby,
    getUserLobbies,
    getLobbyDetails,
}