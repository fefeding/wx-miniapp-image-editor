import { jmPath, jmRect } from "jmgraph";
Component({

    /**
     * 组件的属性列表
     */
    properties: {
      url: {
        type: String,
        value: ''
      },
      files: {
        type: Array,
        value: []
      },
      bounds: {
        type: Object,
      },
      editable: {
        type: Boolean,
        value: true
      },
      moveable: {
        type: Boolean,
        value: false
      },
      sizePercent: {
        type: Number,
        value: 0.8
      },
      renderer: {
        type: String,
        value: ''
      }
    },

    /**
     * 组件的初始数据
     */
    data: {
      jmgraph: null as any,
      images: [] as Array<{
        jImage: any,
        url: string,
        bounds: any,
        scale: number,// 图片展示缩放比例
      }>,
      container: null as any,
      editorCover: null as any, // 裁剪框
    },

    observers: {
      "url": function(val: string) {
        this.showImage(val);
      },
      "files": async function(val: Array<any>) {
        await this.showFiles(val);
      }
    },

    lifetimes: {
      created(){
        
      },
      async ready() {
        const graphComponent = this.selectComponent('#jmgraph_component');
        this.data.jmgraph = await graphComponent.initGraph({
          autoRefresh: true,
          style: {
            fill: 'transparent'
          }
        });
        this.data.container = this.data.jmgraph.createShape('rect', {
          style: {
            fill: 'rgba(0,0,0,0.01)'
          },
          position: {x: 0, y: 0},
          width: '100%',
          height: '100%'
        });
        this.data.jmgraph.children.add(this.data.container); 
        if(this.data.moveable) this.data.container.canMove(true);

        if(this.data.editable) {
          this.data.editorCover = this.data.jmgraph.createShape(ImageEditCover, {
            style: {
              fill: 'rgba(0,0,0,0.01)',
              stroke: 'transparent',
              zIndex: 100,
            },
            interactive: true
          });
          this.data.editorCover.visible = false;
          this.data.container.children.add(this.data.editorCover); 
        }
      }
    },

    /**
     * 组件的方法列表
     */
    methods: {
      async showImage(url: string, offsetY = 0): Promise<any> {
        if(!this.data.jmgraph) {
          return new Promise((resolve)=>{
            setTimeout(async ()=>{
              const res = await this.showImage(url);
              resolve(res);
            }, 500);
          });
        }

        if(url) {
          const isSingleImage = this.data.url && url === this.data.url;
          let imageData = {
            jImage: null as any,
            scale: 1,
            url,
            bounds: null as any,
          };
          const image = this.data.jmgraph.canvas.createImage();
          await new Promise(resolve => {
            image.onload = resolve
            image.src = url
          });   
          // this.data.bounds && this.data.bounds.left > -1 && this.data.bounds.top > -1? this.data.bounds:
          imageData.bounds =  {
            left: 0, top: 0, width: image.width, height: image.height
          };
          const w = this.data.jmgraph.width * this.data.sizePercent;
          const h = this.data.jmgraph.height * this.data.sizePercent;
          // 如果指定了图片展示区域，则采用指定的大小，否则全图展示
          const imgWidth = imageData.bounds.width;
          const imgHeight = imageData.bounds.height;
          const wScale = w / imgWidth;
          const hScale = h / imgHeight;

          if(wScale < hScale || !isSingleImage) {
            imageData.scale = wScale;
          }
          else {
            imageData.scale = hScale;
          }
          const dstW = imageData.scale * imgWidth;
          const dstH = imageData.scale * imgHeight;
          // 指定了url就只展示一张图片
          if(isSingleImage && this.data.images[0]) {            
            imageData = this.data.images[0] = {
              ...this.data.images[0],
              url,
              scale: imageData.scale,
              bounds: imageData.bounds
            };
          }
          else {
            const jImage = this.data.jmgraph.createShape('image', {
              position: { x: 0, y: 0 },
              sourcePosition: { x: 0, y: 0 }, //截取起点
            });
            this.data.container.children.add(jImage);
            imageData.jImage = jImage;
            this.data.images.push(imageData);
          }          

          // 重置当前图片
          imageData.jImage.position = { 
            x: (this.data.jmgraph.width - dstW)/2, 
            y: (isSingleImage?(this.data.jmgraph.height-dstH)/2:1) + offsetY
          };
          // 如果指定了展示区域，则原图起点重指定
          imageData.jImage.sourcePosition.x = imageData.bounds.left;
          imageData.jImage.sourcePosition.y = imageData.bounds.top;
          //伸展或缩小图像
          imageData.jImage.width = dstW;
          imageData.jImage.height = dstH;
          imageData.jImage.sourceWidth = imgWidth;//截取宽度，如果不填则用原图宽
          imageData.jImage.sourceHeight = imgHeight;//截取高度，如果不填则用原图高
          imageData.jImage.image = image;
          imageData.jImage.visible = true;
          // 裁剪区域
          if(isSingleImage && this.data.editorCover) {
            this.data.editorCover.targetBounds.x = imageData.jImage.position.x;
            this.data.editorCover.targetBounds.y = imageData.jImage.position.y;
            this.data.editorCover.targetBounds.width = dstW;
            this.data.editorCover.targetBounds.height = dstH;
            this.data.editorCover.visible = true;
            this.data.editorCover.initControls();// 重绘操作角
          }
          return imageData;
        }
        else {
          if(this.data.editorCover) this.data.editorCover.visible = false;
          if( this.data.images[0]?.jImage) this.data.images[0].jImage.visible = false;
        }
      },
      async showFiles(files: Array<any>) {
        this.data.images = [];        
        if(this.data.container) {
          this.data.container.children.clear();
          this.data.container.height = this.data.jmgraph.height;
        }
        let offsetY = 0;
        let totalHeight = 0;
        for(const f of files) {
          const data = await this.showImage(f.url, offsetY);
          if(data) {
            offsetY = data.jImage.position.y + data.jImage.height;
            totalHeight += data.jImage.height + 5;
            for(const line of f.ocr?.lines) {
              for(const char of line.chars) {
                // 展示错别字  
                //if(char.type) console.log(char);              
                if(char.type === 'wrong' && char.reason !== '识别错误') this.showWrongChar(char, data);
              }
            }
          }
        }
        this.data.container.height = Math.max(this.data.jmgraph.height, totalHeight);
        this.data.container.option.lockSide = {
          left: 0,
          right: 0,
          top: -this.data.container.height + 200,
          bottom: this.data.container.height * 2 - 200,
        }
      },
      // 获取裁剪结果
      getCutResult() {
        if(!this.data.editorCover) {
          return this.data.url;
        }
        const sourceBounds = this.data.editorCover.targetBounds;
        const cutBounds = this.data.editorCover.cutBounds;
        // 如果没有编辑则返回源图片
        if(sourceBounds.x == cutBounds.x && sourceBounds.y == cutBounds.y && sourceBounds.width == cutBounds.width && sourceBounds.height == cutBounds.height) {
          return this.data.url;
        }
        const imageData  = this.data.images[0];
        if(imageData) {
          // 把裁剪的坐标转为源图像的坐标点
          const sx = (cutBounds.x - sourceBounds.x) / imageData.scale;
          const sy = (cutBounds.y - sourceBounds.y) / imageData.scale;
          const sw = cutBounds.width / imageData.scale;
          const sh = cutBounds.height / imageData.scale;

          const canvas = wx.createOffscreenCanvas({
            type: '2d',
            width: sw, 
            height: sh
          });
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imageData.jImage.__img, sx, sy, sw, sh, 0, 0, sw, sh);
          // @ts-ignore
          return canvas.toDataURL("image/png");
        }
      },
      //显示错别字
    showWrongChar(char: {
      char: string;
      new: string;
      type: string;
      reason?: string;
      location: {
        top: number,
        left: number,
        width: number,
        height: number,
      }}, imageData: any) {
        const style = {
          stroke: 'orange',
          close: true,
          fill: 'rgba(0,0,0,0.001)',
          lineWidth: 2 //边线宽
        };
        const position = {
          x: char.location.left * imageData.scale + 2, 
          y: char.location.top * imageData.scale
        };
        const size = {
          width: char.location.width * imageData.scale,
          height: char.location.height * imageData.scale
        };

        // 手画圆形状
        const baseRadius = Math.max(size.width/2, size.height/2); // 基础半径
        const points = 12; // 分割成多少点，减少点数以避免毛刺
        const variance = 3; // 半径的随机偏移量
        const center = {
          x: position.x + size.width/2, y: position.y + size.height/2
        };

        // 生成半径偏移的函数，使用简单的正弦函数模拟平滑变化
        function getRadius(angleIndex: number, totalPoints: number) {
            const angle = (angleIndex / totalPoints) * Math.PI * 2;
            // 使用正弦函数创建周期性变化
            const noise = Math.sin(angle * 1) * (variance / 2); // 3决定波动次数，可调节
            // 添加随机偏移
            const randomOffset = (Math.random() - 0.5) * (variance / 2);
            return baseRadius + noise + randomOffset;
        }
        // 手画圆
        const arc = this.data.jmgraph.createShape('path', { 
          style: style, 
          interactive: true,
          points: [] 
        });

        //一个固定的bezier曲线
        const bezier = this.data.jmgraph.createShape('bezier', { style: style, points: [] });
        let start = {
          x: 0,
          y: 0
        };
        for (let i = 0; i <= points; i++) {
            const angleIndex = i % points;
            const angle = (angleIndex / points) * Math.PI * 2;
            const r = getRadius(angleIndex, points);
            const x = center.x + r * Math.cos(angle);
            const y = center.y + r * Math.sin(angle);
                
            if (i === 0) {
              start = {
                x, y
              };
            } else {
                // 使用二次贝塞尔曲线连接点
                const prevIndex = (i - 1) % points;
                const prevAngle = (prevIndex / points) * Math.PI * 2;
                const prevR = getRadius(prevIndex, points);
                const prevX = center.x + prevR * Math.cos(prevAngle);
                const prevY = center.y + prevR * Math.sin(prevAngle);
                
                // 控制点为当前点和前一个点的中点，加上偏移量
                const cpX = (prevX + x) / 2;
                const cpY = (prevY + y) / 2;
                bezier.cpoints = [
                  start,{
                  x: prevX,
                  y: prevY
                  }, {
                    x: cpX,
                    y: cpY
                  }
                ];
				        arc.points.push(...bezier.initPoints());
                start = {
                  x: cpX,
                  y: cpY
                }
            }
        }
        // 如果有修改原因
        if(char.reason) {
          arc.on('tap', ()=>{            
            wx.showModal({
              title: `${char.char} （${char.new}）`,
              content: char.reason,
              showCancel: false
            });
          });
        }
        imageData.jImage? imageData.jImage.children.add(arc): this.data.jmgraph.children.add(arc);
        if(char.new) {
          const fontSize = 8;          
          const container = this.data.jmgraph.createShape('rect', { 
            style: {
              fill: 'rgba(255,255,255,0.6)',
              radius: 5,
            }, 
            position: {
              x: 0,
              y: - size.height,
            },
            interactive: true,
            width: fontSize + 10,
            height: Math.max(size.height, fontSize+4),
          });
          const textStyle = {
            stroke: 'orange',
            fontSize: fontSize,
            textAlign: 'center',
            close: true,
            //fill: 'orange',
            lineWidth: 1 //边线宽
          };
          const label = this.data.jmgraph.createShape('label', { 
            style: textStyle, 
            position: {
              x: 0, y: 0
            },
            width: '100%',
            height: '100%',
            text: char.new
          });
          container.children.add(label);
          arc.children.add(container);
        }
      },
    }
})

// 图片裁剪框
class ImageEditCover extends jmPath {
  [x: string]: any;
  constructor(params: any = {}) {      
      super(params);      
      this.style.close = this.style.close || true;
      this.init(params);
  }
  // 初始化控件元素
  init(params: any) {
    this.width = this.width || '100%';
    this.height = this.height || '100%';
    // 生成层
    const rectStyle = {
      stroke: 'transparent',
      fill: 'rgba(100,100,100,0.8)',
      lineWidth: 0.1,
    };
    const graph = (this.graph || params.graph);
    const leftRect = graph.createShape(jmRect, {
        position:{x:0, y:0 },
        width: 0,
        height: '100%',
        style: rectStyle,
        interactive: false
      });
      const topRect = graph.createShape(jmRect, {
        position:{x:0, y:0 },
        width: '100%',
        height: 0,
        style: rectStyle,
        interactive: false
      });
      const rightRect = graph.createShape(jmRect, {
        position:{x:0, y:0 },
        width: 0,
        height: '100%',
        style: rectStyle,
        interactive: false
      });
      const bottomRect = graph.createShape(jmRect, {
        position:{x:0, y:0 },
        width: '100%',
        height: 0,
        style: rectStyle,
        interactive: false
      });
      this.rects.push(leftRect, topRect, rightRect, bottomRect);
      this.children.add(leftRect);
      this.children.add(topRect);
      this.children.add(rightRect);
      this.children.add(bottomRect);

      const controlStyle = {
        lineWidth: this.controlLineWidth,        
        stroke: '#fff',
        close: false,        
      };
      const hitArea = {
        x: -this.controlLineWidth/2,
        y: -this.controlLineWidth/2,
        width: this.controlWidth + this.controlLineWidth,
        height: this.controlWidth + this.controlLineWidth,
      };
      const c1 = graph.createShape(jmPath, {
        style: controlStyle,
        hitArea,
        interactive: true
      });
      const c2 = graph.createShape(jmPath, {
        style: controlStyle,
        hitArea,
        interactive: true
      });
      const c3 = graph.createShape(jmPath, {
        style: controlStyle,
        hitArea,
        interactive: true
      });
      const c4 = graph.createShape(jmPath, {
        test: 'c4',
        hitArea,
        style: controlStyle,
        interactive: true
      });
      this.controls.push(c1, c2, c3, c4);
      
      this.children.add(c1);
      this.children.add(c2);
      this.children.add(c3);
      this.children.add(c4);

      c1.canMove(true);
      c2.canMove(true);
      c3.canMove(true);
      c4.canMove(true);

      c1.on('move', (e: any) => {
        if(e.offsetX) {
          const w = this.cutBounds.width - e.offsetX;
          // 不符合最心宽度,就不生效
          if(w > this.cutMiniSize.width) {
            this.cutBounds.x += e.offsetX;
            this.cutBounds.width = w;
          }
          else {
            console.log('最小宽度限制');
          }
        }
        if(e.offsetY) {
          const h = this.cutBounds.height - e.offsetY;
          // 不符合最小高度,就不生效
          if(h > this.cutMiniSize.height) {
            this.cutBounds.y += e.offsetY;
            this.cutBounds.height = h;
          }
        }
        this.resetControlsPosition();
      });

      c2.on('move', (e: any) => {
        if(e.offsetX) {
          const w = this.cutBounds.width + e.offsetX;
          // 不符合最心宽度,就不生效
          if(w > this.cutMiniSize.width) {
            this.cutBounds.width = w;
          }
        }
        if(e.offsetY) {
          const h = this.cutBounds.height - e.offsetY;
          // 不符合最小高度,就不生效
          if(h > this.cutMiniSize.height) {
            this.cutBounds.y += e.offsetY;
            this.cutBounds.height = h;
          }
        }
        this.resetControlsPosition();
      });

      c3.on('move', (e: any) => {
        if(e.offsetX) {
          const w = this.cutBounds.width + e.offsetX;
          // 不符合最心宽度,就不生效
          if(w > this.cutMiniSize.width) {
            this.cutBounds.width = w;
          }
        }
        if(e.offsetY) {
          const h = this.cutBounds.height + e.offsetY;
          // 不符合最小高度,就不生效
          if(h > this.cutMiniSize.height) {
            this.cutBounds.height = h;
          }
        }
        this.resetControlsPosition();
      });

      c4.on('move', (e: any) => {
        if(e.offsetX) {
          const w = this.cutBounds.width - e.offsetX;
          // 不符合最心宽度,就不生效
          if(w > this.cutMiniSize.width) {
            this.cutBounds.x += e.offsetX;
            this.cutBounds.width = w;
          }
        }
        if(e.offsetY) {
          const h = this.cutBounds.height + e.offsetY;
          // 不符合最小高度,就不生效
          if(h > this.cutMiniSize.height) {
            this.cutBounds.height = h;
          }
        }
        this.resetControlsPosition();
      });
  }

  controlLineWidth = 5;
  controlWidth = 10;
  cutMiniSize = {
    width: 100,
    height: 100
  };

  // 裁剪的目录区域
  // 最终改变结果也是这个参数
  targetBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }
  // 裁剪后的区域
  cutBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }

  rects = [] as Array<any>;
  // 操作折角
  controls = [] as Array<any>;

  /**
  * 初始化图形点
  * 控件都是由点形成
  * 
  * @method initPoint
  * @private
  * @for jmArc
  */
  initPoints() {    
      //可以获取当前控件的左上坐标，可以用来画相对位置
      const location = this.getLocation();//获取位置参数      

      const targetRight = this.cutBounds.x + this.cutBounds.width;
      const targetBottom = this.cutBounds.y + this.cutBounds.height;

      this.rects[0].width = this.cutBounds.x + 0.1;

      this.rects[1].height = this.cutBounds.y;
      this.rects[1].width = this.cutBounds.width + 0.1;
      this.rects[1].position.x = this.cutBounds.x;

      this.rects[2].width = location.width - targetRight;
      this.rects[2].position.x = targetRight;

      this.rects[3].height = location.height - targetBottom;
      this.rects[3].width = this.cutBounds.width + 0.1;
      this.rects[3].position.x = this.cutBounds.x;
      this.rects[3].position.y = targetBottom;      
      return this.points;
  }

  // 重置操作折角的位置
    initControls() {
      //可以获取当前控件的左上坐标，可以用来画相对位置
      //const location = this.getLocation();//获取位置参数      

      // 裁剪初始区域为目标大小
      this.cutBounds = {
        ...this.targetBounds
      };

      const targetRight = this.cutBounds.x + this.cutBounds.width;
      const targetBottom = this.cutBounds.y + this.cutBounds.height;
      
      // 锁定移动边界
      const lockSide = {
        left: this.targetBounds.x - this.controlLineWidth/2,
        top: this.targetBounds.y - this.controlLineWidth/2,
        right: targetRight + this.controlLineWidth/2,
        bottom: targetBottom + this.controlLineWidth/2
      };      
      
      this.controls[0].option.lockSide = lockSide;      
      this.controls[1].option.lockSide = lockSide;      
      this.controls[2].option.lockSide = lockSide;      
      this.controls[3].option.lockSide = lockSide;

      this.resetControlsPosition();// 重置位置
  }

  resetControlsPosition() {
    //console.log('rect move reset controls')
    // 操作折角位置
    const targetLeft = this.cutBounds.x;
    const targetRight = this.cutBounds.x + this.cutBounds.width;
    const targetBottom = this.cutBounds.y + this.cutBounds.height;

    this.controls[0].points = [
        {
          x: targetLeft - this.controlLineWidth/2,
          y: this.cutBounds.y + this.controlWidth
        },
        {
          x: targetLeft - this.controlLineWidth/2,
          y: this.cutBounds.y - this.controlLineWidth/2
        },
        {
          x: targetLeft + this.controlWidth,
          y: this.cutBounds.y - this.controlLineWidth/2
        }
      ];

      this.controls[1].points = [
        {
          x: targetRight - this.controlWidth,
          y: this.cutBounds.y - this.controlLineWidth/2
        },
        {
          x: targetRight + this.controlLineWidth/2,
          y: this.cutBounds.y - this.controlLineWidth/2
        },
        {
          x: targetRight + this.controlLineWidth/2,
          y: this.cutBounds.y + this.controlWidth
        }
    ];
    this.controls[2].points = [
      {
        x: targetRight - this.controlWidth,
        y: targetBottom  + this.controlLineWidth/2
      },
      {
        x: targetRight + this.controlLineWidth/2,
        y: targetBottom + this.controlLineWidth/2
      },
      {
        x: targetRight + this.controlLineWidth/2,
        y: targetBottom - this.controlWidth
      }
    ];
    this.controls[3].points = [
      {
        x: targetLeft - this.controlLineWidth/2,
        y: targetBottom - this.controlWidth
      },
      {
        x: targetLeft - this.controlLineWidth/2,
        y: targetBottom + this.controlLineWidth/2
      },
      {
        x: targetLeft + this.controlWidth,
        y: targetBottom + this.controlLineWidth/2
      }
    ];
  }
} 
