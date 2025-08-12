// 简单的事件总线实现
class EventBus {
  constructor() {
    this.events = {};
  }

  // 订阅事件
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // 返回取消订阅的函数
    return () => {
      this.off(event, callback);
    };
  }

  // 取消订阅
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback(data);
      });
    }
  }

  // 清除所有事件
  clear() {
    this.events = {};
  }
}

// 导出单例
export default new EventBus();

// 事件名称常量
export const EVENTS = {
  AVATAR_UPDATED: 'avatar_updated',
  USER_UPDATED: 'user_updated',
  LOGOUT: 'logout'
};