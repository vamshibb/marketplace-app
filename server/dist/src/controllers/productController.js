"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getProducts = exports.createProduct = void 0;
const client_1 = require("../prisma/client");
const createProduct = async (req, res) => {
    try {
        const { title, description, price, image, } = req.body;
        const product = await client_1.prisma.product.create({
            data: {
                title,
                description,
                price: Number(price),
                image,
                sellerId: req.userId,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createProduct = createProduct;
const getProducts = async (req, res) => {
    try {
        const products = await client_1.prisma.product.findMany({
            include: {
                seller: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({
            message: "Server error",
        });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const product = await client_1.prisma.product.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                seller: {
                    select: {
                        email: true,
                    },
                },
            },
        });
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({
            message: "Server error",
        });
    }
};
exports.getProductById = getProductById;
