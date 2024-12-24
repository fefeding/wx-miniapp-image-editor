
Component({

    /**
     * 组件的属性列表
     */
    properties: {
      files: {
        type: Array,
        value: [] as Array<any>
      },
      canRemove: {
        type: Boolean,
        value: true
      }
    },

    /**
     * 组件的初始数据
     */
    data: {
      dragingItem: null as any,
      dropItemId: '',// 拖放到目标对象id
      dragLineLeft: 0,
      containerBounds: null as any,
      filesBounds: null as any,
      dragArguments: {
        lastPosition: {
          x: 0, y: 0
        },
        offset: {
          x: 0,
          y: 0
        }
      }
    },

    /**
     * 组件的方法列表
     */
    methods: {
      // 选中文件
      select(event?: { currentTarget?: { dataset: { id: string; }; }; id?: string}) {
        let id = typeof event === 'string'? event : (event?.currentTarget?.dataset?.id || event?.id);
              
        let currentImage = null;
        let currentImageIndex = -1;
        for(let i=0; i < this.data.files.length; i++) {
          const f = this.data.files[i] as any;
          if(!id) id = f.id; // 如果没有指定就选中第一个
          if(f.id === id) {
            currentImage = f; 
            currentImageIndex = i;  
            break;   
          }
        }
        this.triggerEvent('select', {
          image: currentImage,
          index: currentImageIndex
        });
      },
      // 移除
      removeImage(event: { currentTarget: { dataset: { id: string; }; }; }) {
        const id = event.currentTarget?.dataset?.id;
        if(!id) return;
        let removeIndex = -1;
        let removeImage = null as any;
        for(let i=0; i < this.data.files.length; i++) {
          const f = this.data.files[i] as any;
          if(f.id === id) {
            removeImage = f; 
            removeIndex = i;  
            break;   
          }
        }
        this.triggerEvent('remove', {
          image: removeImage,
          index: removeIndex
        });
      },
      getFileById(id: string) {
        let item = null as any;
        for(const f of this.data.files) {
          if(f.id === id) {
            item = f;
            break;
          }
        }
        return item;
      },
      async getFilesBounds() {
        const res = {} as any;
        for(const f of this.data.files) {
          res[f.id] = await this.getFileBounds(f.id);
        }
        return res;
      },
      async getFileBounds(id: string): Promise<any> {
        const qry = wx.createSelectorQuery().in(this).select('#' + id);
        return new Promise((resolve)=>{
          qry.fields({
            rect: true,
            size: true,
            scrollOffset: true,
          }).exec(function(res){
            if(Array.isArray(res) && res.length) resolve(res[0]);
            else {
              resolve(res || null);
            }
          });
        });        
      },
      // 根据位置获取当前移动到的文件对象
      async getItemByOffsetX(x: number): Promise<string> {
        const containerBounds = this.data.containerBounds || (this.data.containerBounds = await this.getFileBounds('file_container'));// 容器
        const filesBounds = this.data.filesBounds || (this.data.filesBounds = await this.getFilesBounds());
       
        for(let i=0; i<this.data.files.length; i++){
          const id = this.data.files[i].id;
          const bound = filesBounds[id];
          const fx = bound.left - containerBounds.left;
          if(x < fx + bound.width + 5) return id; // 从第一个开始，如果坐标在这个范转内，则返回它
          // 如果是最后个，这里要区分如果已经是超出了，则把当前排到最后，
          // if(i === this.data.files.length -1) {
          //   return '';
          // }
        }
        return '';
      },
      // 把移动光标移到目标文件位置
      async setDragLinePosition(id: string) {
        const containerBounds = this.data.containerBounds || (this.data.containerBounds = await this.getFileBounds('file_container'));// 容器
        const filesBounds = this.data.filesBounds || (this.data.filesBounds = await this.getFilesBounds());
        // 没有id就排到最后
        if(!id) {
          const lastItem = this.data.files[this.data.files.length-1];
          const bounds = filesBounds[lastItem.id];
          if(bounds) {
            this.setData({
              dropItemId: id,
              dragLineLeft: bounds.left - containerBounds.left + bounds.width + 5
            });
          }
          return;
        }
        const bounds = filesBounds[id];        
        if(bounds) {
          this.setData({
            dropItemId: id,
            dragLineLeft: bounds.left - containerBounds.left - 10
          });
        }
      },
      // 开始拖拽
      async dragStart(event: any) {
        const id = event.currentTarget?.dataset?.id;
        if(!id || this.data.files?.length < 2) return;
        const item = this.getFileById(id);
        if(!item) return;
        this.data.filesBounds = null;
        this.data.containerBounds = null;
        await this.setDragLinePosition(item.id);// 光标开始在当前文件位置
        //console.log('start drag', item);
        this.setData({
          dragingItem: item,          
          dragArguments: {
            lastPosition: {
              x: event.touches?.[0]?.pageX,
              y: event.touches?.[0]?.pageY,
            },
            offset: {
              x: 0,
              y: 0,
            }
          }
        });
      },      
      async dragMove(event: any) {        
        let offX = (event.touches?.[0]?.pageX - this.data.dragArguments.lastPosition.x)||0;
        offX +=  this.data.dragArguments.offset.x;
        this.setData({
          dragArguments: {
            lastPosition: {
              x: event.touches?.[0]?.pageX,
              y: event.touches?.[0]?.pageY,
            },
            offset: {
              x: offX,
              y: 0,
            }
          }
        });
        if(!this.data.filesBounds) return;
        const bounds = this.data.filesBounds[this.data.dragingItem?.id];
        if(!bounds) return;
        const positionX = bounds.left - this.data.containerBounds.left + offX;        
        const targetId = await this.getItemByOffsetX(positionX);
        //console.log('line', positionX, targetId);
        this.setDragLinePosition(targetId);
      },
      // 拖拽结束
      dragEnd(event: any) {
        this.data.dragArguments.lastPosition.x = event.touches?.[0]?.pageX;
        // 拖放进行中
        if(this.data.dragingItem && this.data.dragingItem.id !== this.data.dropItemId) {
          const files = [];
          for(const f of this.data.files) {
            if(f.id === this.data.dragingItem.id) continue;
            // 插入到前置的位置
            if(f.id === this.data.dropItemId) {
              files.push(this.data.dragingItem);
            }
            files.push(f);
          }
          // 如果没有指定放置的id，则加到最后
          if(!this.data.dropItemId) {
            files.push(this.data.dragingItem);
          }
          this.triggerEvent('filesSorted', {
            files
          });
        }
        this.setData({
          dragingItem: null,
          filesBounds: null,
          containerBounds: null,
          dragArguments: {
            lastPosition: {
              x: 0,
              y: 0
            },
            offset: {
              x: 0,
              y: 0
            }
          }
        });
      }
    }
})