import { MongoClient, ObjectId } from "mongodb";
import {
	UserModel,
	CartModel,
	OrderModel,
	ProductModel,
	User,
	Product,
} from "./types.ts";
import {
	getUserFromModel,
	getCartFromModel,
	getOrderFromModel,
	getProductFromModel,
} from "./utils.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
	console.error("MONGO_URL not defined");
	Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Connected to MongoDB (￣︶￣*))");

const db = client.db("e-commerce");
const usersCollection = db.collection<UserModel>("usuarios");
const cartsCollection = db.collection<CartModel>("carritos");
const ordersCollection = db.collection<OrderModel>("ordenes");
const productsCollection = db.collection<ProductModel>("productos");

const handler = async (req: Request): Promise<Response> => {
	const method = req.method;
	const url = new URL(req.url);
	const path = url.pathname;
	console.log("Path:", path);
	console.log("Method:", method);

	if (method === "GET") {
		if (path === "/users") {
			const userModels: UserModel[] = await usersCollection.find().toArray();
			const users: User[] = userModels.map((um) => getUserFromModel(um));
			return new Response(JSON.stringify(users), { status: 200 });
		} else if (path === "/products") {
			const prodModel: ProductModel[] = await productsCollection
				.find()
				.toArray();
			const prod: Product[] = prodModel.map((pm) => getProductFromModel(pm));

			return new Response(JSON.stringify(prod), { status: 200 });
		} else if (path === "/carts") {
			const userId = url.searchParams.get("userId");
			if (!userId) {
				return new Response(
					JSON.stringify({ error: "Missing userId query parameter" }),
					{
						status: 400,
					}
				);
			}

			// Fetch the user's cart
			const cartModel: CartModel | null = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!cartModel) {
				return new Response(
					JSON.stringify({ error: "Cart not found for the specified userId" }),
					{ status: 404 }
				);
			}

			// Fetch products related to the cart
			const productModels: ProductModel[] = await productsCollection
				.find({
					_id: { $in: cartModel.products.map((p) => p.productId) },
				})
				.toArray();

			// Map the cart products
			const products = cartModel.products.map((cartItem) => {
				const product = productModels.find(
					(pm) => pm._id!.toString() === cartItem.productId.toString()
				);
				if (!product) {
					throw new Error(`Product with ID ${cartItem.productId} not found`);
				}
				return {
					productId: product._id!.toString(),
					name: product.name,
					quantity: cartItem.quantity,
					price: product.price * cartItem.quantity,
				};
			});

			return new Response(
				JSON.stringify({
					userId: cartModel.userId.toString(),
					products,
				}),
				{ status: 200 }
			);
		} else if (path === "/orders") {
			//
		}
	} else if (method === "POST") {
		if (path === "/users") {
			const body = await req.json();
			if (!body.name || !body.email || !body.password) {
				return new Response(
					JSON.stringify({
						error: "Bad request missing fields in request body.",
						status: 400,
					})
				);
			}
			const exists: UserModel | null = await usersCollection.findOne({
				email: body.email,
			});
			if (exists) {
				return new Response(
					JSON.stringify({
						error: `User with email ${body.email} already exists in DB.`,
						status: 403,
					})
				);
			}
			const { insertedId } = await usersCollection.insertOne({
				name: body.name,
				email: body.email,
				password: body.password,
			});

			return new Response(
				JSON.stringify({
					id: insertedId.toString(),
					name: body.name,
					email: body.email,
				})
			);
		} else if (path === "/products") {
			const { name, description, price, stock } = await req.json();
			if (!name || !price || !stock) {
				return new Response(
					JSON.stringify({
						error: "Bad request missing fields in request body.",
						status: 400,
					})
				);
			}
			const { insertedId } = await productsCollection.insertOne({
				name: name,
				description: description,
				price: price,
				stock: stock,
			});

			// Case --> no description
			if (description === null || description === "") {
				return new Response(
					JSON.stringify({
						id: insertedId.toString(),
						name: name,
						price: price,
						stock: stock,
					})
				);
			}
			// Case --> description available
			return new Response(
				JSON.stringify({
					id: insertedId.toString(),
					name: name,
					description: description,
					price: price,
					stock: stock,
				})
			);
		} else if (path === "/carts/products") {
			const userId = url.searchParams.get("userId");
			if (!userId) {
				return new Response("Bad request, param 'userId' missing in query", {
					status: 400,
				});
			}

			const body = await req.json();
			const { productId, quantity } = body;

			if (!productId || !quantity || quantity <= 0) {
				return new Response(
					JSON.stringify({
						error:
							"Bad request. Must include 'productId' un body and 'quantity' > 0",
					}),
					{ status: 400 }
				);
			}

			// Find user cart
			let cartModel: CartModel | null = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			// If cart does not exists --> create one
			if (!cartModel) {
				const newCart = {
					userId: new ObjectId(userId),
					products: [],
				};
				const { insertedId } = await cartsCollection.insertOne(newCart);
				cartModel = { _id: insertedId, ...newCart };
			}

			// Check if product exists in DB
			const productModel: ProductModel | null =
				await productsCollection.findOne({
					_id: new ObjectId(productId),
				});
			if (!productModel) {
				return new Response(
					JSON.stringify({
						error: `Product with id : ${productId} not found in DB`,
					}),
					{ status: 404 }
				);
			}

			// Update the cart: add or update the product in the cart
			const existingProductIndex = cartModel.products.findIndex(
				(p) => p.productId.toString() === productId
			);

			if (existingProductIndex !== -1) {
				cartModel.products[existingProductIndex].quantity += quantity;
			} else {
				cartModel.products.push({
					productId: new ObjectId(productId),
					quantity,
				});
			}

			// Save the updated cart back to the database
			await cartsCollection.updateOne(
				{ _id: cartModel._id },
				{ $set: { products: cartModel.products } }
			);

			// Map products with full details for the response
			const productModels: ProductModel[] = await productsCollection
				.find({
					_id: { $in: cartModel.products.map((p) => p.productId) },
				})
				.toArray();

			const products = cartModel.products.map((cartItem) => {
				const product = productModels.find(
					(pm) => pm._id!.toString() === cartItem.productId.toString()
				);
				if (!product) {
					throw new Error(`Product with ID ${cartItem.productId} not found`);
				}
				return {
					productId: product._id!.toString(),
					name: product.name,
					quantity: cartItem.quantity,
					price: product.price * cartItem.quantity,
				};
			});

			return new Response(
				JSON.stringify({
					userId: cartModel.userId.toString(),
					products,
				}),
				{ status: 200 }
			);
		} else if (path === "/orders") {
			const userId = url.searchParams.get("userId");

			if (!userId) {
				return new Response("Bad request, param 'userId' missing in query", {
					status: 400,
				});
			}

			// Find the user's cart
			const cart = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!cart) {
				return new Response(
					`Cart not found in DB for user with id: ${userId}`,
					{
						status: 404,
					}
				);
			}

			// Check if user's cart is empty
			if (cart.products.length === 0) {
				return new Response(
					`The cart of user with id:${userId} is empty, order canceled`,
					{ status: 400 }
				);
			}

			// Fetch product details from the products collection
			const productIds = cart.products.map((p) => p.productId);
			const productModels: ProductModel[] = await productsCollection
				.find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
				.toArray();

			// Calculate total price
			let total = 0;
			const orderProducts = [];

			for (const cartProduct of cart.products) {
				const product = productModels.find(
					(p) => p._id!.toString() === cartProduct.productId.toString()
				);

				if (!product) {
					return new Response(
						`Cart product with id:${cartProduct.productId} not found in DB`
					);
				}

				// Check enough stock available
				if (product.stock < cartProduct.quantity) {
					return new Response(`Insufficient stock for ${product.name}`, {
						status: 400,
					});
				}

				// Calculate total price for each product
				const productTotal = product.price * cartProduct.quantity;
				total += productTotal;

				// Update product stock in DB
				await productsCollection.updateOne(
					{ _id: product._id },
					{ $inc: { stock: -cartProduct.quantity } }
				);

				// Add product info to the order
				orderProducts.push({
					productId: product._id!,
					name: product.name,
					quantity: cartProduct.quantity,
					price: productTotal,
				});
			}

			// Create a new order document
			const newOrder = {
				userId: new ObjectId(userId),
				products: orderProducts,
				total,
				date: new Date(),
			};

			const orderResult = await ordersCollection.insertOne(newOrder);

			// Optionally, clear the user's cart after the order
			await cartsCollection.updateOne(
				{ userId: new ObjectId(userId) },
				{ $set: { products: [] } }
			);

			// Return the order confirmation
			return new Response(
				JSON.stringify({
					orderId: orderResult.insertedId.toString(),
					userId: userId,
					products: orderProducts,
					total: total,
					date: newOrder.date.toString().split("T")[0], // Format the date (YYYY-MM-DD)
				}),
				{ status: 201 }
			);
		}
	} else if (method === "PUT") {
		if (path.startsWith("/products/")) {
			const productId = path.split("/")[2];

			if (!productId) {
				return new Response(
					JSON.stringify({ error: "Product ID is required" }),
					{
						status: 400,
					}
				);
			}

			const body = await req.json();

			// Update the product in DB
			const { modifiedCount } = await productsCollection.updateOne(
				{ _id: new ObjectId(productId) },
				{ $set: body }
			);

			if (modifiedCount === 0) {
				return new Response(`Product with id : ${productId} not found in DB`, {
					status: 404,
				});
			}

			// Check update
			const updatedProduct = await productsCollection.findOne({
				_id: new ObjectId(productId),
			});

			if (!updatedProduct) {
				return new Response("Product not found after update", {
					status: 404,
				});
			}

			return new Response(
				JSON.stringify({
					id: updatedProduct._id.toString(),
					name: updatedProduct.name,
					description: updatedProduct.description,
					price: updatedProduct.price,
					stock: updatedProduct.stock,
				}),
				{ status: 200 }
			);
		}
	} else if (method === "DELETE") {
		if (path.startsWith("/products/")) {
			const productId = path.split("/")[2];
			if (!productId) {
				return new Response(
					JSON.stringify({ error: "Product ID is required" }),
					{
						status: 400,
					}
				);
			}

			// Safe Delete:
			try {
				// Check if product is in carts
				const isInCart = await cartsCollection.findOne({
					"products.productId": new ObjectId(productId),
				});

				// Check if product is in orders
				const isInOrder = await ordersCollection.findOne({
					"products.productId": new ObjectId(productId),
				});

				if (isInCart || isInOrder) {
					return new Response(
						JSON.stringify({
							error: "Cannot delete product. It is in a cart or order.",
						}),
						{ status: 400 }
					);
				}

				// Delete the product from DB
				const { deletedCount } = await productsCollection.deleteOne({
					_id: new ObjectId(productId),
				});

				if (deletedCount === 0) {
					return new Response(
						`Product with id : ${productId} not found in DB`,
						{
							status: 404,
						}
					);
				}

				return new Response("Product deleted successfully", {
					status: 200,
				});
			} catch (error) {
				console.error("Error deleting product:", error);
				return new Response(
					JSON.stringify({ error: "Internal Server Error" }),
					{ status: 500 }
				);
			}
		} else if (path.startsWith("/carts/products")) {
			const userId = url.searchParams.get("userId");
			const productId = url.searchParams.get("productId");

			if (!userId || !productId) {
				return new Response(
					JSON.stringify({ error: "Both userId and productId are required" }),
					{ status: 400 }
				);
			}

			// Find the user's cart
			const cart = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!cart) {
				return new Response(JSON.stringify({ error: "Cart not found" }), {
					status: 404,
				});
			}

			// Check if the product exists in the cart
			const productInCart = cart.products.find(
				(product) => product.productId.toString() === productId
			);

			if (!productInCart) {
				return new Response(
					JSON.stringify({ error: "Product not found in the cart" }),
					{ status: 404 }
				);
			}

			// Remove the product from the cart
			await cartsCollection.updateOne(
				{ userId: new ObjectId(userId) },
				{ $pull: { products: { productId: new ObjectId(productId) } } }
			);

			// Return the updated cart
			const updatedCart = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!updatedCart) {
				return new Response("Cart not found after update", { status: 404 });
			}

			return new Response(
				JSON.stringify({
					userId: updatedCart.userId.toString(),
					products: updatedCart.products.map((p) => ({
						productId: p.productId.toString(),
						quantity: p.quantity,
					})),
				}),
				{ status: 200 }
			);
		} else if (path === "carts") {
			const userId = url.searchParams.get("userId");

			if (!userId) {
				return new Response(JSON.stringify({ error: "userId is required" }), {
					status: 400,
				});
			}

			// Find the user's cart
			const cart = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!cart) {
				return new Response(JSON.stringify({ error: "Cart not found" }), {
					status: 404,
				});
			}

			// Empty the cart by removing all products
			await cartsCollection.updateOne(
				{ userId: new ObjectId(userId) },
				{ $set: { products: [] } }
			);

			// Return the updated empty cart
			const updatedCart = await cartsCollection.findOne({
				userId: new ObjectId(userId),
			});

			if (!updatedCart) {
				return new Response("Cart not found after update", { status: 404 });
			}

			return new Response(
				JSON.stringify({
					userId: updatedCart.userId.toString(),
					products: updatedCart.products,
				}),
				{ status: 200 }
			);
		}
	}
	return new Response(JSON.stringify({ error: "Endpoint Not Found" }), {
		status: 404,
	});
};
Deno.serve({ port: 4000 }, handler);
