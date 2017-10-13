## terraineditor
This terrain editor offers you the following two ways to design your own terrain:
* Brush-based height manipulation
* Brush-based multi-layer texturing

The terrain format produced by this terrain editor will be image-based. Once the documentation is ready you shouldn't have much trouble integrating it into your own projects.

Feel free to check out the current state of development by following the instructions below. I'd be happy about any feedback :)

#### Instructions
```
git clone https://github.com/bernhardfritz/terraineditor.git
cd terraineditor
npm i
npm start
```

#### Controls
* `W`, `A`, `S`, `D`, `SPACE`, `SHIFT` for movement
* hold `middle mousebutton` to temporarily switch to *CAMERA MODE*
* while in *CAMERA MODE* move your mouse to rotate the camera
* `esc` to switch to *COMMAND MODE*
* while in *COMMAND MODE* you can safely use the sliders in the menu without worrying about accidentally altering your terrain in any way
* `C` to switch to *CAMERA MODE* (alternative to `middle mousebutton`)
* `E` to switch to *EDIT MODE*
* while in *EDIT MODE* use `left mousebutton` / `right mousebutton` to raise / lower terrain in an indicated area around your cursor
* `T` to switch to *TEXTURE MODE*
* while in *TEXTURE MODE*, use `left mousebutton` / `right mousebutton` to apply / erase the current texture layer in an indicated area around your cursor
* while in *TEXTURE MODE*, use `1` (default), `2`, `3` to switch between texture layers
* the base texture layer (layer 0) is applied to the whole terrain per default and cannot be erased
* all texture layers are added on top of each other, layer 0 being on the very bottom and layer 3 on the very top

#### Screenshots
![screenshot](https://i.imgur.com/4xvgs03.png)
![screenshot](https://i.imgur.com/vLyrvMl.jpg)
![screenshot](https://i.imgur.com/cgILxgf.jpg)

#### TODO
* Saving/Loading of terrain
* Detailed documentation of the terrain format
* Implementation of a JavaScript module that allows you to directly import terrain files into your three.js scene
* Allow textures to be drag and dropped into texture layer slots during runtime
* Custom brushes
* Keyframe-based modification of sky parameters over time
