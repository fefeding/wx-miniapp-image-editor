const { getLoginInfo } = require('./loginCache');
// 请求服务
function request(url, data, options) {
  console.log('request', url, data);
  return new Promise((resolve, reject) => {
    const header = getRequestHeader(options?.header||{});
    const reqOption = {
      url: url,
      data,
      timeout: 300000,
      method: 'POST',
      success(res) {
            console.log('request success', res);
            resolve(res.data);
      },
      fail(err) {
        console.error(err);
        wx.reportEvent("error", {
          "error_type": "request",
          "msg": err.errMsg,
          "stack": url + ' ' + err.errno,
        })
        resolve({
          ret: err.errno || -1,
          msg: err.errMsg || '系统异常'
        })
      },
      ...options,
      header,
    };
    console.log(reqOption);
    try {
      const task = wx.request(reqOption);
      // 如果有指定响应回调，则不等待
      if(options && options.success) {
          resolve(task);
      }
    }
    catch(e) {
      console.error(e);
      reject(e);
    }
  });    
}
// 上传文件
function uploadFile(url, data, options) {
  //console.log('uploadFile', url, data);
  return new Promise((resolve, reject) => {
    const header = getRequestHeader(options?.header||{});
    const reqOption = {
      url: url,
      ...data,
      method: 'POST',
      success(res) {
            console.log('uploadFile success', res);
            resolve(res.data);
      },
      fail(err) {
        console.error(err);
        resolve({
          ret: err.errno || -1,
          msg: err.errMsg || '系统异常'
        })
      },
      ...options,
      header,
    };
    if(!reqOption.name) {
      reqOption.name = 'file_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    }
    console.log(reqOption);
    try {
      wx.uploadFile(reqOption);
    }
    catch(e) {
      console.error(e);
      reject(e);
    }
  });    
}

// 在请求的header中带上cookie
function getRequestHeader(header) {
  const loginInfo = getLoginInfo();
  let cookie = '';
  if (loginInfo) {        
    cookie += `login_id=${loginInfo.loginId};`; 
    cookie += `token=${loginInfo.id};`; 
    cookie += `app_id=${loginInfo.appId};`;
  }
  header['cookie'] = cookie;
  const app = getApp();
  header['x-client-version'] = app.data.version;
  header['Content-Type'] = header['Content-Type'] || "application/json; charset=utf-8";
  return header;
}


export {
  request,
  uploadFile
}

