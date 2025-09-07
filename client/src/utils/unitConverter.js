/**
 * 前端单位换算工具
 */
export class UnitConverter {
  // 单位到克的换算表
  static unitToGram = {
    'g': 1,
    '克': 1,
    'kg': 1000,
    '千克': 1000,
    '公斤': 1000,
    '斤': 500,
    '两': 50,
  };

  /**
   * 将任意单位转换为克
   */
  static toGram(value, unit) {
    const rate = this.unitToGram[unit] || 1;
    return value * rate;
  }

  /**
   * 从克转换为指定单位
   */
  static fromGram(grams, unit) {
    const rate = this.unitToGram[unit] || 1;
    return grams / rate;
  }

  /**
   * 格式化显示
   */
  static format(value, unit) {
    if (unit === '斤' || unit === 'kg' || unit === '千克') {
      return value.toFixed(2);
    } else if (unit === 'g' || unit === '克') {
      return Math.round(value).toString();
    }
    return value.toFixed(3);
  }

  /**
   * 获取单位换算提示
   */
  static getConversionHint(grams, targetUnit) {
    const amount = this.fromGram(grams, targetUnit);
    const formatted = this.format(amount, targetUnit);
    return `相当于 ${formatted} ${targetUnit}`;
  }
}