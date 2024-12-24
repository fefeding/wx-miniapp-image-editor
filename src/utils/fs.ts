const fs = wx.getFileSystemManager();
// base64数据转为临时文件
export async function base64ToFile(base64Data: string, fileName?: string, ext: string = ".png"): Promise<string> {
  const arr = base64Data.split(',');
  //const mime = arr[0].match(/:(.*?);/)[1];
  return new Promise((resolve, reject) => {
    if(!fileName) {
      fileName = Date.now() + '_' + Math.floor(Math.random() * 100000) + ext;
    }
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFile({
      filePath,
      data: arr[1] || base64Data,
      encoding: 'base64',
      success:(err)=>{        
        if(err?.errCode) {
          wx.reportEvent("error", {
            "error_type": "fs",
            "msg": err.errMsg,
            "stack": err.errCode
          })
          reject(err);
          return;
        }
        resolve(filePath);
      },
      fail: (err) => {
        if(err) {
          console.error(err);
        }
        wx.reportEvent("error", {
          "error_type": "fs",
          "msg": err.errMsg,
          "stack": err.errCode
        })
        reject(err);
      }
    });
  });
}