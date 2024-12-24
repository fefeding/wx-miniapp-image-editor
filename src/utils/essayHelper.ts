
export const maxImageFileCount = 5; // 最大可选文件个数
export const essayActionList = [
  '体验示例',
  '拍照',
  '导入微信聊天文件',
  '从相册中获取',
  //'上传文档(PDF,word)'
];
export interface EssayFile {
  fileType?: 'image' | 'video';
  type?: 'image'|'video'|'file';
  /** 本地临时文件大小，单位 B */
  size: number
  /** 本地临时文件路径 (本地路径) */
  tempFilePath?: string;
  path?: string;
}
// 跳转到批改作文
export function redirectToEssay(type: string, files?: Array<EssayFile>) {
  wx.navigateTo({
    url: "/pages/essay/start?type=" + type,
    success(res) {
      // 发送文件
      res.eventChannel.emit('sendFileData', {
        files: files || []
      });
    }
  });
}

export function showAddFileActionSheet(option = {
  itemList: essayActionList,
  count: maxImageFileCount,
  success: null as any,
}) {
  wx.showActionSheet({
    itemList: option.itemList,
    //alertText: '测试',
    success: (res) => {
      // 有回调直交给调用方处理
      if(option.success) {
        return option.success(res);
      }
      switch(res.tapIndex) {
        // 体验
        case 0: {
          break;
        }
        // 拍照 
        case 1: {
          selectImageFile(['camera'], option);
          break;
        }
        // 从聊天取 
        case 2: {
          selectFileFromMessage('image', option);
          break;
        }
        // 相册 
        case 3: {
          selectImageFile(['album'], option);
          break;
        }
        // 上传文件
        case 4: {
          selectFileFromMessage('file', option);
          break;
        }
      }
    }          
  });
}

export function selectImageFile(sourceType: any = ['album', 'camera'], option = {
  count: maxImageFileCount,
  success: null as any,
}) {
  wx.chooseMedia({
    count: option.count,
    mediaType: ['image'],
    sourceType,
    sizeType: ['compressed'], // 是否压缩所选文件
    maxDuration: 30,
    camera: 'back',
    success: (res) => {
      if(res.tempFiles?.length) {
        if(option.success) {
          option.success(sourceType[0], res.tempFiles);
          return;
        }
        redirectToEssay(sourceType[0], res.tempFiles);
      }
    }
  })
}

// 从聊天会话中选择图片
export function selectFileFromMessage(type: 'all'|'video'|'image'|'file' = 'image', option = {
  count: maxImageFileCount,
  success: null as any,
}) {
  // 聊天会话中选择
  wx.chooseMessageFile({
    count: option.count,
    type, // 'all' | 'video' | 'image' | 'file'
    success: (res) => {
      if(res.tempFiles?.length) {
        if(option.success) {
          option.success(type, res.tempFiles);
          return;
        }
        redirectToEssay(type, res.tempFiles);
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

export async function showErrorModal(option?: {
  title?: string,
  confirmText?: string,
  cancelText?: string,
}, confrim?:()=>void, cancel?: ()=>void) {
  const confirm = await wx.showModal({
    title: '操作失败',
    confirmText: "重试",
    cancelText: "返回", 
    ...option,           
  });
  if(confirm.confirm) {
    if(confrim) confrim();
  }
  else {    
    if(cancel) {
      cancel();
    }
    else {
      wx.navigateBack({
        fail: ()=>{
          wx.switchTab({
            url: '/pages/index/index',
            fail(err) {
              console.error(err);
            }
          });
        }
      });
    }
  }
  return confirm;
}