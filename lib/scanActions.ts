// lib/scanActions.ts

export interface BasketItem {
  id: string;
  name: string;
  sku_15_digits: string;
  prefix: string;
  height: string | number;
  width: string | number;
  length: string | number;
  received_date: string;
  unit: string;
  current_stock: number;
  amount: number; // จำนวนที่จะนำเข้า/ออก
}

// ฟังก์ชันสำหรับเพิ่มของเข้าตะกร้า (ถ้าซ้ำให้ +1)
export const addToBasket = (currentBasket: BasketItem[], product: any): BasketItem[] => {
  const existingIndex = currentBasket.findIndex(item => item.sku_15_digits === product.sku_15_digits);
  
  if (existingIndex > -1) {
    const newBasket = [...currentBasket];
    newBasket[existingIndex].amount += 1;
    return newBasket;
  } else {
    return [...currentBasket, { ...product, amount: 1 }];
  }
};

// ฟังก์ชันปรับจำนวนในตะกร้า
export const updateBasketQty = (currentBasket: BasketItem[], sku: string, delta: number): BasketItem[] => {
  return currentBasket.map(item => {
    if (item.sku_15_digits === sku) {
      const newAmount = Math.max(1, item.amount + delta);
      return { ...item, amount: newAmount };
    }
    return item;
  });
};
