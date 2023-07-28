import React, { Fragment } from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { Tool } from '../components/Toolbar/Tool';
import { FlyoutMenu } from '../components/Toolbar/FlyoutMenu';
import { IconExpand, IconHandTool, IconZoomIn, IconZoomOut } from '../assets/icons';

const ToolView = observer(({ item }) => {
  return (
    <Fragment>
      <Tool
        active={item.selected}
        icon={<IconHandTool />}
        ariaLabel="pan"
        label="Pan Image"
        shortcut="H"
        onClick={() => {
          const sel = item.selected;

          item.manager.selectTool(item, !sel);
        }}
      />
      <Tool
        icon={<IconZoomIn />}
        ariaLabel="zoom-in"
        label="Zoom In"
        shortcut="ctrl+plus"
        onClick={() => {
          item.handleZoom(1);
        }}
      />
      <FlyoutMenu
        icon={<IconExpand />}
        items={[
          {
            label: 'Zoom to fit',
            shortcut: 'shift+1',
            onClick: () => {
              item.sizeToFit();
            },
          },
          {
            label: 'Zoom to actual size',
            shortcut: 'shift+2',
            onClick: () => {
              item.sizeToOriginal();
            },
          },
        ]}
      />
      <Tool
        icon={<IconZoomOut />}
        ariaLabel="zoom-out"
        label="Zoom Out"
        shortcut="ctrl+minus"
        onClick={() => {
          item.handleZoom(-1);
        }}
      />
    </Fragment>
  );
});

function calculateDistance(touch1, touch2) {
  const deltaX = touch1.clientX - touch2.clientX;
  const deltaY = touch1.clientY - touch2.clientY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

const _Tool = types
  .model('ZoomPanTool', {
    // image: types.late(() => types.safeReference(Registry.getModelByTag("image")))
    group: 'control',
  })
  .views(self => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },

    get stageContainer() {
      return self.obj.stageRef.container();
    },
  }))
  .actions(self => ({
    shouldSkipInteractions() {
      return true;
    },

    mouseupEv() {
      self.mode = 'viewing';
      self.previousTouchEvent = null;
      self.stageContainer.style.cursor = 'grab';
    },

    updateCursor() {
      if (!self.selected || !self.obj?.stageRef) return;
      self.stageContainer.style.cursor = 'grab';
    },

    afterUpdateSelected() {
      self.updateCursor();
    },

    handleDrag(ev) {
      const item = self.obj;

      let offsetX;
      let offsetY;

      // it is a mouse event
      if (ev.movementX !== undefined && self.previousTouchEvent.movementX !== undefined) {
        offsetX = ev.clientX - self.previousTouchEvent.clientX;
        offsetY = ev.clientY - self.previousTouchEvent.clientY;
      } else if (ev.movementX === undefined && self.previousTouchEvent.movementX === undefined) { // it is a touch event
        offsetX = ev.touches[0].clientX - self.previousTouchEvent.touches[0].clientX;
        offsetY = ev.touches[0].clientY - self.previousTouchEvent.touches[0].clientY;
      } else {
        return;
      }

      const posx = item.zoomingPositionX + offsetX;
      const posy = item.zoomingPositionY + offsetY;

      item.setZoomPosition(posx, posy);
    },

    mousemoveEv(ev) {
      const zoomScale = self.obj.zoomScale;

      // Handle two finger zooming
      if (ev.touches && ev.touches.length > 1) {
        console.log('touch move event in zoom pan tool');

        if (self.previousTouchEvent !== null && self.previousTouchEvent.touches && self.previousTouchEvent.touches.length > 1) {
          const dist1 = calculateDistance(ev.touches[0], ev.touches[1]);
          const dist2 = calculateDistance(self.previousTouchEvent.touches[0], self.previousTouchEvent.touches[1]);

          const pinchAmount = dist1 - dist2;

          if (pinchAmount > 4) {
            self.handleZoom(1);
          } else if (pinchAmount < -4) {
            self.handleZoom(-1);
          } else {
            if (zoomScale <= 1) return;

            if (self.mode === 'moving') {
              self.handleDrag(ev);
              self.stageContainer.style.cursor = 'grabbing';
            }
          }
        }
      } else {
        if (zoomScale <= 1) return;

        if (self.mode === 'moving') {
          self.handleDrag(ev);
          self.stageContainer.style.cursor = 'grabbing';
        }
      }

      self.previousTouchEvent = ev;
    },

    mousedownEv(ev) {
      // don't pan on right click
      if (ev.button === 2) return;

      if (ev.touches && ev.touches.length >= 1) {
        console.log('touch start event in zoom pan tool');
      }

      self.previousTouchEvent = ev;

      self.mode = 'moving';
      self.stageContainer.style.cursor = 'grabbing';
    },

    handleZoom(val) {
      const item = self.obj;

      item.handleZoom(val);
    },

    sizeToFit() {
      const item = self.obj;

      item.sizeToFit();
    },

    sizeToAuto() {
      const item = self.obj;

      item.sizeToAuto();
    },

    sizeToOriginal() {
      const item = self.obj;

      item.sizeToOriginal();
    },
  }));

const Zoom = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { Zoom };
