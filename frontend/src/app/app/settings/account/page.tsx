'use client';
import Container from "@/components/Container"
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import authSlice from "@/redux/features/auth/authSlice";


const Account = () => {
	const router = useRouter()
	const dispatch = useDispatch()

	const logout = () => {
		dispatch(authSlice.actions.logout())
		router.push("/app/login")
	}

	return (
		<Container className="flex-col gap-10 items-start">
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-bold">Logout ? </h2>
				<p className="opacity-60">logout from current account</p>
				<button
					onClick={logout}
					className="px-2 py-1 w-20 bg-chat-red font-bold rounded-lg"
				>
					Logout
				</button>
			</div>
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-bold">Details</h2>
				<p className="opacity-60">detiails of your account</p>
			</div>
		</Container>
	)
}

export default Account
