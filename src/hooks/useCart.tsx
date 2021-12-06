import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function setCartAndLocalStorage(products: Product[]) {
    setCart(products);

    localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
  }

  const addProduct = async (productId: number) => {
    try {
      const stock: Stock = (await api.get(`stock/${productId}`)).data;

      const product: Product = (await api.get(`products/${productId}`)).data;

      const cartProduct = cart.find(m => m.id === product.id);

      //Validação para ver se a quantidade existe em estoque
      if (cartProduct?.amount === stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      };

      //Caso o produto já exita no carrinho, apenas atualizamos o amount
      if (cartProduct) {
        const newCart = [...cart];

        const itemToUpdate = newCart.find(m => m.id === productId);

        if (itemToUpdate) {
          itemToUpdate.amount += 1;
        }

        setCartAndLocalStorage(newCart);

        return;
      }

      //Caso não exista, adicionamos ele inteiro
      const newProduct = {
        ...product,
        amount: 1
      };

      setCartAndLocalStorage([...cart, newProduct]);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const products = [...cart];

      const product = products.find(m => m.id === productId);

      if (!product) {
        throw new Error();
      }

      const newCart = products.filter(m => m.id !== productId);

      setCartAndLocalStorage(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock: Stock = (await api.get(`stock/${productId}`)).data;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const products = [...cart];

      const itemToUpdate = products.find(m => m.id === productId);

      if (itemToUpdate) {
        itemToUpdate.amount = amount;

        setCartAndLocalStorage(products);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
