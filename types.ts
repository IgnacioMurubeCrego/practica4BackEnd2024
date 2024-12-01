import { ObjectId, OptionalId } from "mongodb";

// Carts

export type CartModel = OptionalId<{
	userId: ObjectId;
	products: { productId: ObjectId; quantity: number }[];
}>;

export type Cart = {
	id: string;
	userId: string;
	products: CartProductModel[];
};

// Orders

export type OrderModel = OptionalId<{
	userId: ObjectId;
	products: {
		productId: ObjectId;
		name: string;
		quantity: number;
		price: number;
	}[];
	total: number;
	date: Date;
}>;

export type Order = {
	id: string;
	userId: User;
	products: CartProduct[];
	total: number;
	date: string;
};

// Users

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

// Products

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

// CartProducts

export type CartProductModel = OptionalId<{
	productId: ObjectId;
	name: string;
	quantity: number;
	price: number;
}>;

export type CartProduct = {
	id: string;
	name: string;
	quantity: number;
	price: number;
};
