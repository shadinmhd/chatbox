import React from "react"
import {
	Dialog,
	DialogTrigger,
	DialogTitle,
	DialogFooter,
	DialogHeader,
	DialogContent,
	DialogDescription
} from "../ui/dialog"
import { Icon } from "@iconify/react/dist/iconify.js"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import newGroupFormSchema from "@/models/newGroupFormSchema"
import { z } from "zod"
import { isAxiosError } from "axios"
import { toast } from "sonner"
import Api from "@/services/Api"

interface Props {
	open: boolean,
	onOpenChange: (open: boolean) => void
}

type formType = z.infer<typeof newGroupFormSchema>
type className = string

const inputStyle: className = "px-3 py-1 rounded-lg outline-none border border-black text-black"

const NewGroup: React.FC<Props> = ({ open, onOpenChange }) => {

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<formType>({ resolver: zodResolver(newGroupFormSchema) })

	const onFormSubmit = async (data: formType) => {
		try {
			const response = await Api.post("/chat/group", data)
			if (response.data.success)
				toast.success(response.data.message)
			else
				toast.error(response.data.error)
		} catch (error) {
			if (isAxiosError(error))
				if (error.response?.data.message)
					toast.error(error.response.data.message)
				else
					toast.error(error.message)
			else
				toast.error("something went wrong")
			console.log(error)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger>
				<Icon icon={"mdi:users-plus"} className="text-4xl text-chat-green outline-none" />
			</DialogTrigger>
			<DialogContent className="bg-chat-black text-white">
				<DialogHeader>Create new group</DialogHeader>
				<form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-2">
					<input
						{...register("name")}
						type="text"
						className={inputStyle}
						placeholder="Name"
					/>
					{errors.name && <p className="text-chat-red">{errors.name.message}</p>}
					<input
						{...register("description")}
						type="text"
						className={inputStyle}
						placeholder="Description"
					/>
					{errors.description && <p className="text-chat-red">{errors.description.message}</p>}
					<button type="submit" className="bg-black font-bold py-1 rounded-lg">
						Create
					</button>
				</form>
				<DialogFooter></DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default NewGroup
