App({
  onLaunch(option) {
    console.log('launch option', option);
    if(option?.query?.env) this.data.env = option.query.env;
    this.initData();
    console.log('app data', this.data);
    wx.reportEvent('launch', {
      launch_path: option.path || '',
      query: JSON.stringify(option.query),
    });
  },
  onShow(option) {
    this.initData();
    wx.reportEvent('app_show', {
      launch_path: option.path || '',
      query: JSON.stringify(option.query),
    });
  },
  initData() {
    if(!this.data.appInfo) this.data.appInfo = wx.getAppBaseInfo();
    if(!this.data.windowInfo) this.data.windowInfo = wx.getWindowInfo();
    if(!this.data.accountInfo) this.data.accountInfo = wx.getAccountInfoSync(); 
    if(!this.data.deviceInfo) this.data.deviceInfo = wx.getDeviceInfo();
    if(!this.data.version) this.data.version = this.data.accountInfo.miniProgram?.version || '';
    const self = this;
        let ios = !!(this.data.deviceInfo?.system?.toLowerCase().search('ios') + 1);
        let rect;
        try {
          rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
          if (rect === null) {
            throw 'getMenuButtonBoundingClientRect error';
          }
          //取值为0的情况  有可能width不为0 top为0的情况
          if (!rect.width || !rect.top || !rect.left || !rect.height) {
            throw 'getMenuButtonBoundingClientRect error';
          }
        } catch (error) {
          let gap = 0; //胶囊按钮上下间距 使导航内容居中
          let width = 96; //胶囊的宽度
          if (this.data.deviceInfo.platform === 'android') {
            gap = 8;
            width = 96;
          } else if (this.data.deviceInfo.platform === 'devtools') {
            if (ios) {
              gap = 5.5; //开发工具中ios手机
            } else {
              gap = 7.5; //开发工具中android和其他手机
            }
          } else {
            gap = 4;
            width = 88;
          }
          if (!this.data.windowInfo.statusBarHeight) {
            //开启wifi的情况下修复statusBarHeight值获取不到
            this.data.windowInfo.statusBarHeight = this.data.windowInfo.screenHeight - this.data.windowInfo.windowHeight - 20;
          }
          rect = {
            //获取不到胶囊信息就自定义重置一个
            bottom: this.data.windowInfo.statusBarHeight + gap + 32,
            height: 32,
            left: this.data.windowInfo.windowWidth - width - 10,
            right: this.data.windowInfo.windowWidth - 10,
            top: this.data.windowInfo.statusBarHeight + gap,
            width: width
          };
          console.log('error', error);
          console.log('rect', rect);
        }

        let navBarHeight = 0;
        if (!this.data.windowInfo.statusBarHeight) {
          this.data.windowInfo.statusBarHeight = this.data.windowInfo.screenHeight - this.data.windowInfo.windowHeight - 20;
          navBarHeight = (function() {
            let gap = rect.top - self.data.windowInfo.statusBarHeight;
            return 2 * gap + rect.height;
          })();

          this.data.windowInfo.statusBarHeight = 0;
          this.data.windowInfo.navBarExtendHeight = 0; //下方扩展4像素高度 防止下方边距太小
        } else {
          navBarHeight = (function() {
            let gap = rect.top - self.data.windowInfo.statusBarHeight;
            return self.data.windowInfo.statusBarHeight + 2 * gap + rect.height;
          })();
          if (ios) {
            this.data.windowInfo.navBarExtendHeight = 4; //下方扩展4像素高度 防止下方边距太小
          } else {
            this.data.windowInfo.navBarExtendHeight = 0;
          }
        }
        this.data.windowInfo.navBarHeight = navBarHeight; //导航栏高度不包括statusBarHeight
        this.data.windowInfo.capsulePosition = rect; //右上角胶囊按钮信息bottom: 58 height: 32 left: 317 right: 404 top: 26 width: 87 目前发现在大多机型都是固定值 为防止不一样所以会使用动态值来计算nav元素大小
        this.data.deviceInfo.ios = ios; //是否ios
  },
  onError(err: any) {
    wx.reportEvent("error", {
      "error_type": "global",
      "msg": err.message || err,
      "stack": err.stack
    })
  },
  data: {
    version: '1.0',
    env: 'pro',
    // 服务端DB中的APP唯一ID，不是微信小程序的APP id
    serverAppId: 1,
  } as any,
});
