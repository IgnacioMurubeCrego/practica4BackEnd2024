import { MongoClient, ObjectId, OptionalId } from "mongodb";
import {
	UserModel,
	CartModel,
	OrderModel,
	ProductModel,
	User,
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

	if (method === "GET") {
		if (path === "/users") {
			const userModels: UserModel[] = await usersCollection.find().toArray();
			const users: User[] = userModels.map((um) => getUserFromModel(um));
			return new Response(JSON.stringify(users), { status: 200 });
		} else if (path === "/products") {
			//
		} else if (path === "/carts") {
			//
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
			//
		} else if (path === "/carts/products?userId=1") {
			//
		}
	} else if (method === "PUT") {
		if (path === "/products/:id") {
			//
		}
	} else if (method === "DELETE") {
		if (path === "/products/:id") {
			//
		} else if (path === "/carts/products") {
			//
		} else if (path === "carts") {
			//
		}
	}
	return new Response(JSON.stringify({ error: "Endpoint Not Found" }), {
		status: 404,
	});
};
Deno.serve({ port: 4000 }, handler);
