import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import app from '@shared/infra/http/app';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import ICreateOrderDTO from '../dtos/ICreateOrderDTO';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer', 400);
    }

    const registredProducts = await this.productsRepository.findAllById(
      products,
    );

    products.forEach(({ id, quantity }) => {
      const registredProduct = registredProducts.find(p => p.id === id);

      if (!registredProduct) {
        throw new AppError('Produto inválido!', 400);
      }

      if (registredProduct.quantity < quantity) {
        throw new AppError('Quantidade insuficiente!', 400);
      }
    });

    const orderProducts = products.map(({ id, quantity }) => ({
      product_id: id,
      price:
        registredProducts[registredProducts.findIndex(p => p.id === id)].price,
      quantity,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
