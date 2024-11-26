import { ObjectId, OptionalId } from "mongodb";

export type CartModel = OptionalId<{
	userId: ObjectId;
	products: ObjectId[];
}>;

export type Cart = {
	id: string;
	userId: User;
	products: cartProduct[];
};

export type OrderModel = OptionalId<{
	userId: ObjectId;
	products: ObjectId[];
	total: number;
	date: Date;
}>;

export type Order = {
	id: string;
	userId: User;
	products: Product[];
	total: number;
	date: string;
};

export type UserModel = OptionalId<{
	name: string;
	email: string;
	password: string;
}>;

export type User = {
	id: string;
	name: string;
	email: string;
};

export type ProductModel = OptionalId<{
	name: string;
	description: string;
	price: number;
	stock: number;
}>;

export type Product = {
	id: string;
	name: string;
	description: string;
	price: number;
	stock: number;
};

export type cartProduct = {
	id: string;
	name: string;
	quantity: number;
	price: number;
};
