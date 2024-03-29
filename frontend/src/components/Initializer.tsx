"use client";
import { AppDispatch, RootState } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import Container from "./Container";
import { PuffLoader } from "react-spinners"
import authSlice from "@/redux/features/auth/authSlice";
import { getUser } from "@/redux/features/user/userActions";
import { useRouter } from "next/navigation";
import socketSlice from "@/redux/features/socket/socketSlice";
import { getRequests, getChats } from "@/redux/features/chat/chatActions";
import { toast } from "sonner";
import { Icon } from "@iconify/react/dist/iconify.js";
import chatSlice from "@/redux/features/chat/chatSlice";
import parseMessage from "@/utils/messageParser";

const Initializer = ({ children }: { children: React.ReactNode }) => {

	const router = useRouter()
	const dispatch: AppDispatch = useDispatch()
	const [initialized, setInitializer] = useState(false)

	const user = useSelector((state: RootState) => state.user.user)
	const socket = useSelector((state: RootState) => state.socket)
	const auth = useSelector((state: RootState) => state.auth.loggedIn)
	const chat = useSelector((state: RootState) => state.chat.chats)

	useEffect(() => {
		if (!socket.socket)
			dispatch(socketSlice.actions.initiate())
	}, [])

	useEffect(() => {
		if (localStorage.getItem("token")) {
			dispatch(authSlice.actions.setLoggedIn(true))
			dispatch(getRequests())
		} else {
			router.push("/login")
		}
	}, [])

	useEffect(() => {
		if (auth) {
			dispatch(getRequests())
			dispatch(getUser())
			dispatch(getChats())
		}
	}, [auth])

	useEffect(() => {
		const interval = setInterval(() => {
			if (auth) {
				dispatch(getUser())
				dispatch(getRequests())
			}
		}, 3000)

		return () => {
			clearInterval(interval)
		}
	}, [auth])

	useEffect(() => {
		(async () => {
			if (auth) {

				socket?.socket?.on("connect", async () => {
					console.log("connected")
				})

				socket.socket?.on("call:start", ({ offer, caller, callerName }) => {
					console.log(offer)
					dispatch(socketSlice.actions.setOffer(offer))
					toast("incoming call", {
						icon: <Icon icon="solar:phone-bold" />,
						description: callerName,
						duration: 10000,
						position: "top-right",
						action: {
							label: "Accept",
							onClick: () => {
								router.push(`/app/call?accept=true&user=${caller}&video=true`)
							},
						},
						cancel: {
							label: "cancel"
						}
					})
				})

				socket.socket?.on("message:recieve", (data) => {
					console.log(data)
					dispatch(chatSlice.actions.updateLatestMessage({ id: data.chat, message: data.text || data.file.name, time: new Date(Date.now()) }))
				})

				socket?.socket?.on("noti:recieve", (data) => {
					if (data.status == "success")
						toast("message", { description: parseMessage(data.message, 35), position: "top-right" })
				})

				socket.socket?.on("chat:friend:request", (data) => {
					dispatch(chatSlice.actions.appendRequest(data))
				})

				socket.socket?.on("chat:friend:cancel", (data) => {
					console.log("request cancelled")
					dispatch(chatSlice.actions.deleteRequest(data.id))
				})

				socket.socket?.on("unauthorized", (data) => {
					localStorage.removeItem("token")
					router.push("/login")
				})
			}
		})()
	}, [socket, auth])

	useEffect(() => {
		if (auth && user?._id && !initialized) {
			console.log("initializing", user._id)
			socket.socket?.emit("initiate", { token: localStorage.getItem("token"), id: user._id })
			setInitializer(true)
		}
	}, [user, auth])

	return (
		<>
			{
				initialized ?
					<>
						{children}
					</> :
					<Container>
						<PuffLoader color="#397FFF" />
					</Container>
			}
		</>
	)
}

export default Initializer
