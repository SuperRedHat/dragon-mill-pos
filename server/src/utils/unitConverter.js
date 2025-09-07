/**
 * 单位换算工具类
 */
class UnitConverter {
  // 单位到克的换算表
  static unitToGram = {
    'g': 1,
    '克': 1,
    'kg': 1000,
    '千克': 1000,
    '公斤': 1000,
    '斤': 500,
    '两': 50,
    'lb': 453.592, // 磅
  };

  /**
   * 将任意单位转换为克
   * @param {number} value 数值
   * @param {string} unit 单位
   * @param {number} customRate 自定义换算率（用于包、个等特殊单位）
   * @returns {number} 克数
   */
  static toGram(value, unit, customRate = null) {
    if (customRate) {
      return value * customRate;
    }
    
    const rate = this.unitToGram[unit];
    if (!rate) {
      throw new Error(`未知的单位: ${unit}`);
    }
    
    return value * rate;
  }

  /**
   * 从克转换为指定单位
   * @param {number} grams 克数
   * @param {string} unit 目标单位
   * @param {number} customRate 自定义换算率
   * @returns {number} 目标单位的数值
   */
  static fromGram(grams, unit, customRate = null) {
    if (customRate) {
      return grams / customRate;
    }
    
    const rate = this.unitToGram[unit];
    if (!rate) {
      throw new Error(`未知的单位: ${unit}`);
    }
    
    return grams / rate;
  }

  /**
   * 格式化显示（根据单位保留合适的小数位）
   */
  static format(value, unit) {
    if (unit === '斤' || unit === 'kg' || unit === '千克') {
      return parseFloat(value.toFixed(2));
    } else if (unit === 'g' || unit === '克') {
      return Math.round(value);
    }
    return parseFloat(value.toFixed(3));
  }

  /**
   * 计算配方材料的实际用量
   * @param {number} recipeWeight 配方总重（克）
   * @param {number} percentage 材料百分比
   * @param {string} stockUnit 库存单位
   * @returns {object} { gramAmount: 克数, unitAmount: 库存单位数量, display: 显示文本 }
   */
  static calculateRecipeAmount(recipeWeight, percentage, stockUnit, customRate = null) {
    const gramAmount = recipeWeight * percentage / 100;
    const unitAmount = this.fromGram(gramAmount, stockUnit, customRate);
    const formattedAmount = this.format(unitAmount, stockUnit);
    
    return {
      gramAmount: Math.round(gramAmount),
      unitAmount: formattedAmount,
      display: `${formattedAmount}${stockUnit} (${Math.round(gramAmount)}g)`
    };
  }
}

export default UnitConverter;