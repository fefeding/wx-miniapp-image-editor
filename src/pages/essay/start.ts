import * as essayHelper from "../../utils/essayHelper";
import { base64ToFile } from "../../utils/fs";

// pages/essay/start.ts
Page({

    /**
     * 页面的初始数据
     */
    data: {
      type: 'camera', // camera 拍照，
      action: '',
      files: [] as Array<any>,
      currentFile: null as any,
      maxFileCount: essayHelper.maxImageFileCount,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(option) {
      console.log(option);
      const type = option.type || this.data.type || 'camera';
      if(option.type) {
        this.setData({
          type: type
        });
      }
      const eventChannel = this.getOpenerEventChannel();
      eventChannel?.on?.('sendFileData', (data) => {        
        if(data?.files?.length) {
          this.data.files = [];
          this.pushFile(data.files);
        }
      });
    },
    // 增加文件
    pushFile(file: any) {
      if(Array.isArray(file)) {
        for(const f of file) {
          this.pushFile(f);
        }
        this.selectFile(this.data.files[this.data.files.length-1].id);// 选中最后新加的
        return;
      }
      const f = {
        id: 'file_' + Math.floor(Date.now() + Math.random()*100000 + (file.size||0)),
        ...file,
        path: file.path || file.tempFilePath,
        type: file.type || file.fileType,
    };
      console.log('add file', f);
      const files = this.data.files.concat(f);
      this.setData({
        files: files
      });
    },
    // 选中文件
    selectFile(event: string| {detail: any}) {
      // 当前页面逻辑触发的，则调用组件内的选择
      if(typeof event === 'string') {
        const ele = this.selectComponent('#imageSelecter');
        ele.select(event);
      }
      // 响应选择事件
      else if(event.detail && event.detail.image) {

        for(const f of this.data.files) {
          if(f.id === event.detail.image.id) {
            f.selected = true;
            this.data.currentFile = f;
          }
          else {
            f.selected = false;
          }
        }
        this.setData({
          files: this.data.files,
          currentFile: this.data.currentFile
        });
      }
    },
    // 排序
    filesSorted(event: {detail: any}) {
      if(event.detail?.files) {
        this.setData({
          files: event.detail.files
        })
      }
    },
    // 移除指定的文件
    removeFile(event: {detail: any}) {
      const id = event.detail?.image?.id;
      const index = event.detail?.index;

      if(!id) return;
      wx.showModal({
        title: "确定移除这个图片吗？",
        confirmText: '移除',
        success: (res) => {
          if(res.confirm) {
            const files = this.data.files.filter((f) => {
              return f.id !== id;
            });
            this.setData({
              files
            }, () => {
              // 刚好删除选中的图片，则重选一个
              if(this.data.currentFile?.id === id) {
                const curFile = files[index] || files[index-1];
                this.selectFile(curFile?.id || '');
              }
            });
          }
        }
      });
    },
    // 添加
    addFile(event: any) {
      const count = essayHelper.maxImageFileCount - this.data.files.length;
      if(count <= 0) return;
      const option = {
        count,
        success: (type: string, files: Array<any>) => {
          if(files?.length) {
            this.pushFile(files);        
          }
        }
      };
      essayHelper.showAddFileActionSheet({
        itemList: [
          '拍照',
          '导入微信聊天文件',
          '从相册中获取',
          //'上传文档(PDF,word)'
        ],
        count: count,
        success: (res: any) => {
          switch(res.tapIndex) {
            // 拍照 
            case 0: {
              essayHelper.selectImageFile(['camera'], option);
              break;
            }
            // 从聊天取 
            case 1: {
              essayHelper.selectFileFromMessage('image', option);
              break;
            }
            // 相册 
            case 2: {
              essayHelper.selectImageFile(['album'], option);
              break;
            }
            // 上传文件
            case 3: {
              essayHelper.selectFileFromMessage('file', option);
              break;
            }
          }
        }
      });
    },
    // 编辑保存
    async cutImageDone() {
      if(!this.data.currentFile) return;
      const editor = this.selectComponent('#image_editor');
      if(!editor) return;
      const newImage = editor.getCutResult();// 获取裁剪结果
      if(!newImage || newImage === this.data.currentFile.path) return;// 没有改变
      try {
        //const fileName = Date.now() + '_' + Math.floor(Math.random() * 100000);
        //console.log('new image', newImage);
        const newPath = await base64ToFile(newImage, '', ".png");// 转为临时文件      
        this.data.currentFile.path = newPath;
      }
      catch(e) {
        // 转成临时文件失败，则用base64
        //this.data.currentFile.path = newImage;
        wx.showToast({
          title: "保存失败，无法编辑图片"
        });
      }
      this.selectFile(this.data.currentFile.id);// 刷新
    },
    // 去解析作业
    goPolish() {
      wx.navigateTo({
        url: "/pages/essay/decode",
        success: (res) => {
          // 发送文件
          res.eventChannel.emit('sendFileData', {
            files: this.data.files
          });
        }
      });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})