import { Collection } from "mongodb";
import {
	Cart,
	CartModel,
	cartProduct,
	Order,
	OrderModel,
	Product,
	ProductModel,
	User,
	UserModel,
} from "./types.ts";

export const getUserFromModel = (userModel: UserModel): User => {
	return {
		id: userModel._id.toString(),
		name: userModel.name,
		email: userModel.email,
	};
};

export const getProductFromModel = (productModel: ProductModel): Product => {
	return {
		id: productModel._id.toString(),
		name: productModel.name,
		description: productModel.description,
		price: productModel.price,
		stock: productModel.stock,
	};
};

export const getCartFromModel = async (
	cartModel: CartModel,
	productsCollection: Collection<ProductModel>
): Promise<Cart> => {
	const productModels: ProductModel[] = await productsCollection
		.find({ _id: { $in: cartModel.products } })
		.toArray();
	const products: Product[] = productModels.map((pm) =>
		getProductFromModel(pm)
	);
	return {
		id: cartModel._id.toString(),
		userId: cartModel.userId.toString(),
		products: products,
	};
};

const fromProductToCartProduct = (prod: Product, quant: number) => {
	return {
		id: prod.id,
		name: prod.name,
		quantity: quant,
		price: prod.price * quant,
	};
};

export const getOrderFromModel = async (
	orderModel: OrderModel,
	productsCollection: Collection<ProductModel>
): Promise<Order> => {
	const productModels: ProductModel[] = await productsCollection
		.find({ _id: { $in: orderModel.products } })
		.toArray();
	const products: Product[] = productModels.map((pm) =>
		getProductFromModel(pm)
	);
	return {
		id: orderModel._id.toString(),
		userId: orderModel.userId.toString(),
		products: products,
		total: orderModel.total,
		date: orderModel.date.toString(),
	};
};

const fromCartModelToOrderModel = async (
	cartModel: CartModel,
	cartsCollection: Collection
) => {
	const newOrder = {
		userId: cartModel.userId,
		products: cartModel.products,
		total: cartModel.products.reduce((total: number, prod: cartProduct) => {
			total = total + prod.price;
		}, 0),
		date: new Date(),
	};

	// Vaciar carrito
	await cartsCollection.updateOne(
		{ _id: cartModel },
		{ $set: { products: [] } }
	);

	return {
		newOrder,
	};
};
