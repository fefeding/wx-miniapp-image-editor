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

export async function showAddFileActionSheet(fileCount: number, itemList: Array<string> = [
  '拍照',
  '导入微信聊天文件',
  '从相册中获取',
]): Promise<{type: string, files: Array<any>}> {
  return new Promise((resolve) => {
    const success =  (type: string, files: Array<any>)=>{
      resolve({
        type,
        files
      })
    };
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        switch(res.tapIndex) {
          // 拍照 
          case 0: {
            selectImageFile(['camera'], fileCount, success);
            break;
          }
          // 从聊天取 
          case 1: {
            selectFileFromMessage('image', fileCount, success);
            break;
          }
          // 相册 
          case 2: {
            selectImageFile(['album'], fileCount, success);
            break;
          }
          // 上传文件
          case 3: {
            selectFileFromMessage('file', fileCount, success);
            break;
          }
        }
      }          
    });
  });
}

export function selectImageFile(sourceType: any = ['album', 'camera'], fileCount: number, success: (type:string, files:Array<any>)=>void) {
  wx.chooseMedia({
    count: fileCount,
    mediaType: ['image'],
    sourceType,
    sizeType: ['compressed'], // 是否压缩所选文件
    maxDuration: 30,
    camera: 'back',
    success: (res) => {
      if(res.tempFiles?.length) {
          success(sourceType[0], res.tempFiles);
      }
    }
  })
}

// 从聊天会话中选择图片
export function selectFileFromMessage(type: 'all'|'video'|'image'|'file' = 'image', fileCount: number, success: (type:string, files:Array<any>)=>void) {
  // 聊天会话中选择
  wx.chooseMessageFile({
    count: fileCount,
    type, // 'all' | 'video' | 'image' | 'file'
    success: (res) => {
      if(res.tempFiles?.length) {
        success(type, res.tempFiles);
      }
    },
    fail(err) {
      if(err?.errMsg === 'chooseMessageFile:fail cancel') {
        return;
      }
      console.error(err);
      wx.showToast({
        title: err.errMsg,
        icon: 'none'
      })
    }
  });
}