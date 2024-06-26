import http from "http"
import scoket from "socket.io"
import RequestRepository from "../repository/request.repository"
import UserRepository from "../repository/user.repository"
import MessageRepository from "../repository/message.repository"
import FileRepository from "../repository/file.repository"
import S3Repository from "../repository/s3.repository"
import ChatModel from "../models/chat.model"
import ChatRepository from "../repository/chat.repository"
import IChat from "../interface/chat.interface"
import socketAuthorize from "../lib/socketAuthorize"


const chatRepository = new ChatRepository()
const requestRepositroy = new RequestRepository()
const userRepository = new UserRepository()
const messageRepository = new MessageRepository()
const fileRepository = new FileRepository()
const s3Repositroy = new S3Repository()
let connections: { id: string, socket: string }[] = []

const getUserId = (socketId: string) => {
	const currentUser = connections.find((e) => e.socket == socketId)
	return currentUser?.id
}

const getSocketId = (id: string) => {
	const currentUser = connections.find((e) => e.id == id)
	if (currentUser)
		return currentUser.socket
	else
		return false
}


const configureSocket = (server: http.Server) => {
	const io = new scoket.Server(server, {
		cors: {
			origin: "*",
		},
		transports: ["websocket", "polling"],
		maxHttpBufferSize: 5 * 1024 * 1024
	})

	io.on("connect", (socket) => {

		socket.on("initiate", async (data) => {
			const id = socketAuthorize(data.token, socket)
			if (!id) return
			console.log(data)
			await userRepository.setOnlineStatus(data.id, true)
			connections.push({ id: data.id, socket: socket.id })
			const user = await userRepository.findById(data.id)
		})

		socket.on("chat:friend:request", async (data) => {
			const response = await requestRepositroy.create({ sender: data.sender._id, reciever: data.to })
			const socketId = getSocketId(data.to)
			if (socketId) {
				io.to(socketId).emit("noti:recieve", {
					status: "success",
					message: `${data.sender.username}: send a friend request`
				})
				io.to(socketId).emit("chat:friend:request", response.request)
			}
		})

		socket.on("chat:friend:cancel", async (data) => {
			await requestRepositroy.delete(data.id)
			const socketId = getSocketId(data.to)
			if (socketId)
				io.to(socketId).emit("chat:friend:cancel", data)
		})

		socket.on("chat:friend:unfriend", async (data) => {
			console.log(data)
			await userRepository.unfriend(data.id, data.friend)
			await chatRepository.deletechat({ id: data.chat })
			const socketId = getSocketId(data.friend)
			if (socketId) {
				io.to(socketId).emit("noti:recieve", {
					status: "success",
					message: `${data.username}: removed you from their friend list`
				})
			}
		})

		socket.on("chat:friend:block", async (data) => {
			await userRepository.block(data.id, data.friend)
			await chatRepository.deletechat({ id: data.chat })
			const socketId = getSocketId(data.friend)
			if (socketId) {
				io.to(socketId).emit("noti:recieve", {
					status: "success",
					message: `${data.username}: has blocked you`
				})
			}
		})

		socket.on("chat:friend:unblock", async (data) => {
			const id = getUserId(socket.id)
			if (id) {
				const currentUser = await userRepository.findById(id)
				userRepository.unBock(currentUser?.user?._id!, data.id)
				requestRepositroy.deleteByUsers(data.id, currentUser?.user?._id!)
			}
		})

		socket.on("chat:friend:accept", async (data) => {
			try {
				await requestRepositroy.accept({ sender: data.id, reciever: data.user })
				await new ChatModel({
					group: false,
					members: [
						{ user: data.id, role: "user" },
						{ user: data.user, role: "user" }
					]
				}).save()
				console.log(data)
				const response = await userRepository.addFriend(data.user, data.id)
				console.log(response)
				const socketId = getSocketId(data.id)
				if (response.success) {
					if (socketId) {
						io.to(socketId).emit("noti:recieve", {
							status: "success",
							message: `${data.username}: accepted your friend request`
						})
					}
				} else {
					socket.emit("noti:recieve", {
						status: "success",
						message: `failed accept user request`
					})
				}
			} catch (error) {
				console.log(error)
			}
		})

		socket.on("chat:group:join", (data) => {
			console.log("group join", socket.id, data)
			socket.join(data.id)
		})

		socket.on("groups:init", ({ groups }: { groups: IChat[] }) => {
			console.log("grouping", groups)
			if (groups) {
				groups.forEach((e) => {
					if (e.group)
						socket.join(e._id!)
				})
			}
		})

		socket.on("message:send", async (data) => {
			console.log(data)
			const currentUser = getUserId(socket.id)
			let fileRespone: any
			if (data.file) {
				await s3Repositroy.upload(data.file, data.key)
				const url = await s3Repositroy.getUrl(data.key)
				fileRespone = await fileRepository.create({
					name: data.file.name,
					size: data.file.size,
					user: currentUser,
					key: data.key,
					url: url.url
				})
			}

			const response = await messageRepository.create({
				chat: data.chat,
				createdAt: data.createdAt,
				sender: currentUser,
				text: data.text,
				file: fileRespone?.file?._id
			})

			await chatRepository.changeLatestMessage(data.chat, data.text || data.file.name, currentUser!)
			const message = response.data

			if (data.group) {
				console.log("group", data)
				socket.broadcast.to(data.chat).emit("message:recieve", message)
				socket.broadcast.to(data.chat).emit("noti:recieve", {
					status: "success",
					message: `${data.username}: ${data.text ? data.text : data?.file?.name}`
				})
			} else {
				const socketId = getSocketId(data.to)
				if (socketId) {
					message!.file! = fileRespone?.file
					io.to(socketId).emit("message:recieve", message)
					io.to(socketId).emit("noti:recieve", {
						status: "success",
						message: `${data.username}: ${data.text ? data.text : data?.file?.name}`
					})
				}
			}
		})

		socket.on("call:start", ({ caller, to, callerName, offer }) => {
			const recieverSocket = getSocketId(to)
			if (!recieverSocket) {
				socket.emit("call:failed", { message: "the person you are calling is currently unavailable" })
				return
			}
			io.to(recieverSocket).emit("call:start", { caller, offer, callerName, callerSocketId: socket.id })
		})

		socket.on("call:accept", ({ ans, caller }) => {
			const callerSocket = getSocketId(caller)
			if (callerSocket)
				io.to(callerSocket).emit("call:accepted", { ans })
		})

		socket.on("disconnect", async () => {
			const id = getUserId(socket.id)
			if (!id) return

			await userRepository.setOnlineStatus(id, false)
			const user = await userRepository.findById(id)
			user.user?.friends?.forEach((e: any) => {
				const socketId = getSocketId(e?._id!)
				if (socketId)
					io.to(socketId).emit("friend:offline", { id: e?._id! })
			})
			connections = connections.filter((e) => e.socket != socket.id)
			console.log(connections)
		})
	})

	return io
}

export default configureSocket 
