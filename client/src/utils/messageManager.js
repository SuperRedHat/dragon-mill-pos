// 全局消息管理器
class MessageManager {
  constructor() {
    this.messageApi = null;
  }

  setMessageApi(api) {
    this.messageApi = api;
  }

  success(content) {
    if (this.messageApi) {
      this.messageApi.success(content);
    } else {
      console.log('Success:', content);
    }
  }

  error(content) {
    if (this.messageApi) {
      this.messageApi.error(content);
    } else {
      console.error('Error:', content);
    }
  }

  warning(content) {
    if (this.messageApi) {
      this.messageApi.warning(content);
    } else {
      console.warn('Warning:', content);
    }
  }

  info(content) {
    if (this.messageApi) {
      this.messageApi.info(content);
    } else {
      console.info('Info:', content);
    }
  }
}

export default new MessageManager();