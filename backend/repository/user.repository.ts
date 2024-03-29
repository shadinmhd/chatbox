import IUser from "../interface/user.interface"
import UserModel from "../models/user.model"

class UserRepository {
	constructor() { }

	async create(user: IUser) {
		try {
			const response = await new UserModel(user).save()
			return {
				success: true,
				message: "user created"
			}
		} catch (error: any) {
			console.log(error)
			if (error.code == 11000) {
				const field = Object.keys(error.keyPattern)[0]
				return {
					success: false,
					message: `${field} all ready in use`
				}
			}
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async addFriend(id: string, friendId: string) {
		try {
			console.log(id, friendId)
			await Promise.all([
				UserModel.updateOne({ _id: id }, { $addToSet: { friends: friendId } }),
				UserModel.updateOne({ _id: friendId }, { $addToSet: { friends: id } })
			])

			return {
				success: true,
				message: "friend added"
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async update(user: IUser) {
		try {
			const response = await UserModel.findOneAndUpdate({ _id: user._id }, {
				$set:
				{
					email: user.email,
					bio: user.bio,
					username: user.username,
					admin: user.admin,
					active: user.active,
					image: user.image
				}
			}, { new: true })

			return {
				success: true,
				message: "user updated",
				user: response
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async findByEmail(email: string) {
		try {
			const response = await UserModel.findOne({ email })
			if (!response) {
				console.log("no user found")
				return {
					success: false,
					message: "user not found",
				}
			}
			return {
				success: true,
				message: "user found",
				user: response
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async findById(id: string) {
		try {
			const response = await UserModel.findOne({ _id: id })
				.populate({ path: "friends", select: "-password" })
				.populate({ path: "blocked", select: "-password" })
			return {
				success: true,
				message: "fetched user",
				user: response
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async findAllUsersAdmin(search?: { name: string }) {
		try {
			let query: any = {}
			if (search?.name) {
				query.username = { $regex: search.name, $options: "i" }
			}
			const response = await UserModel.find(query, { id: false, password: false })
			return {
				success: true,
				message: "fetched all users",
				users: response
			}
		} catch (error) {
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async findAllUsers(id: string, search?: { name: string }) {
		try {
			let query: any = {}
			if (search?.name) {
				query.username = { $regex: search.name, $options: "i" }
			}
			const response = await UserModel.find({ ...query, blocked: { $nin: [id] }, _id: { $ne: id } }, { id: false, password: false })
			return {
				success: true,
				message: "fetched all users",
				users: response
			}
		} catch (error) {
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async getVerificationToken(email: string) {
		try {
			const response = await UserModel.findOne({ email }, { verificationToken: 1, _id: 0, email: 1 })
			return {
				success: true,
				message: "token fetched",
				token: response?.verificationToken,
				email: response?.email
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async verifyEmail(token: string, email: string) {
		try {
			const response = await UserModel.findOneAndUpdate({ email, verificationToken: token }, { $set: { verified: true }, /* $unset: { verificationToken: 1 }  */ })
			return {
				success: true,
				message: "fetched user token",
				token: response?.verificationToken
			}
		} catch (error) {
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async setOnlineStatus(id: string, online: boolean) {
		try {
			if (online) {
				const response = await UserModel.updateOne({ _id: id }, { $set: { online: online } })
			}
			else {
				const time = Date.now()
				console.log(time)
				const response = await UserModel.updateOne({ _id: id }, { $set: { online, lastOnline: time } })
			}
			return {
				success: true,
				message: "user status online changed"
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async changePass(password: string, id: string) {
		try {
			await UserModel.updateOne({ _id: id }, { $set: { password } })

			return {
				success: true,
				message: "user password updated"
			}

		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async unfriend(id: string, friend: string) {
		try {
			Promise.all([
				UserModel.updateOne({ _id: id }, { $pull: { friends: friend } }),
				UserModel.updateOne({ _id: friend }, { $pull: { friends: id } })
			])
			return {
				success: true,
				message: "user unfriended successfully"
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async block(id: string, friend: string) {
		try {
			Promise.all([
				UserModel.updateOne({ _id: id }, { $pull: { friends: friend }, $addToSet: { blocked: friend } }),
				UserModel.updateOne({ _id: friend }, { $pull: { friends: id } }),
			])
			return {
				success: true,
				message: "user unfriended successfully"
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				message: "database error"
			}
		}
	}

	async unBock(id: string, user: string) {
		try {
			const response = await UserModel.updateOne({ _id: id }, { $pull: { blocked: user } })
			return {
				success: false,
				message: "user unblock successfull"
			}
		} catch (error) {
			console.log(error)
			return {
				success: false,
				mesage: "database error"
			}
		}
	}
}

export default UserRepository
