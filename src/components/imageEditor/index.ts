import { base64ToFile, showAddFileActionSheet } from "../../utils/fs";

// components/imageEditor/index.ts
Component({

    /**
     * 组件的属性列表
     */
    properties: {
      // 所有图片
      files: {
        type: Array,
        value: [] as Array<any>
      },
      // 当前选中图片
      currentFile: null as any,
      // 最多加载多少个图片
      maxFileCount: {
        type: Number,
        value: 5
      }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
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
        if(!this.data.files?.length) {
          this.setData({
            currentFile: null
          });
          return;
        }
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
      async addFile(event: any) {
        const count = this.data.maxFileCount - this.data.files.length;
        if(count <= 0) return;
        
        const res = await showAddFileActionSheet(count);
        this.pushFile(res.files);  
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
    }
})