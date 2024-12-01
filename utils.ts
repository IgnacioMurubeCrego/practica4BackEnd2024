import { Collection } from "mongodb";
import {
	CartProduct,
	Order,
	OrderModel,
	Product,
	ProductModel,
	User,
	UserModel,
} from "./types.ts";

export const getUserFromModel = (userModel: UserModel): User => {
	return {
		id: userModel._id!.toString(),
		name: userModel.name,
		email: userModel.email,
	};
};

export const getProductFromModel = (productModel: ProductModel): Product => {
	return {
		id: productModel._id!.toString(),
		name: productModel.name,
		description: productModel.description,
		price: productModel.price,
		stock: productModel.stock,
	};
};

export const getOrderFromModel = async (
	orderModel: OrderModel,
	productsCollection: Collection<ProductModel>
): Promise<Order> => {
	// Fetch product details for all product IDs in the order
	const productModels: ProductModel[] = await productsCollection
		.find({ _id: { $in: orderModel.products.map((p) => p.productId) } })
		.toArray();

	// Map product models to cart products with the required details
	const cartProducts: CartProduct[] = orderModel.products.map(
		(orderProduct) => {
			const productModel = productModels.find(
				(p) => p._id!.toString() === orderProduct.productId.toString()
			);

			if (!productModel) {
				throw new Error(`Product with ID ${orderProduct.productId} not found`);
			}

			return {
				id: productModel._id!.toString(),
				name: productModel.name,
				quantity: orderProduct.quantity,
				price: productModel.price * orderProduct.quantity, // Calculate total price per product
			};
		}
	);

	// Return the Order object
	return {
		id: orderModel._id!.toString(),
		userId: orderModel.userId.toString(),
		products: cartProducts,
		total: orderModel.total, // Total order price
		date: orderModel.date.toISOString().split("T")[0], // Convert Date to ISO string
	};
};
