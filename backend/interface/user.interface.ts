interface IUser {
	_id?: string,
	username?: string,
	password?: string,
	email?: string,
	image?: string,
	bio?: string,
	admin?: boolean,
	active?: boolean,
	online?: boolean,
	lastOnline?: Date,
	verified?: boolean,
	blocked?: [],
	friends?: string[],
	settings?: {
		theme?: "DARK" | "LIGHT",
		icons?: {
			call?: string,
			chat?: string,
			settings?: string,
			home?: string
		}
	}
	verificationToken?: string
}

export default IUser
