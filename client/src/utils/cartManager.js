/**
 * 购物车管理工具
 * 用于跨页面传递配方数据
 */
class CartManager {
  static STORAGE_KEY = 'temp_recipe_cart';

  /**
   * 添加配方到临时购物车
   */
  static addRecipe(recipe, weight = 100) {
    const cart = this.getCart();
    const item = {
      id: `recipe-${recipe.id}-${Date.now()}`,
      type: 'recipe',
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipe: recipe,
      weight: weight,
      timestamp: Date.now()
    };
    
    cart.push(item);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
    
    // 触发自定义事件，通知其他页面
    window.dispatchEvent(new CustomEvent('recipeCartUpdated', { 
      detail: { action: 'add', item } 
    }));
    
    return item;
  }

  /**
   * 获取临时购物车
   */
  static getCart() {
    try {
      const cart = localStorage.getItem(this.STORAGE_KEY);
      return cart ? JSON.parse(cart) : [];
    } catch (error) {
      console.error('获取临时购物车失败:', error);
      return [];
    }
  }

  /**
   * 清空临时购物车
   */
  static clearCart() {
    localStorage.removeItem(this.STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('recipeCartUpdated', { 
      detail: { action: 'clear' } 
    }));
  }

  /**
   * 移除指定配方
   */
  static removeRecipe(itemId) {
    const cart = this.getCart();
    const newCart = cart.filter(item => item.id !== itemId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newCart));
    
    window.dispatchEvent(new CustomEvent('recipeCartUpdated', { 
      detail: { action: 'remove', itemId } 
    }));
  }

  /**
   * 获取并清理过期项（超过24小时）
   */
  static getValidCart() {
    const cart = this.getCart();
    const now = Date.now();
    const validCart = cart.filter(item => {
      return (now - item.timestamp) < 24 * 60 * 60 * 1000; // 24小时
    });
    
    if (validCart.length !== cart.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validCart));
    }
    
    return validCart;
  }
}

export default CartManager;