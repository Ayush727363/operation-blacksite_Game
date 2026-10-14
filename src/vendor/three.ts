/**
 * Complete Hardware-Accelerated WebGL2/WebGL1 Three.js-Compatible 3D Engine Module.
 * Implements the standard Three.js API surface (Scene, PerspectiveCamera, WebGLRenderer,
 * Object3D, Mesh, Group, InstancedMesh, Line, Points, Sprite, Geometries, Materials,
 * Lights, Raycaster, Math primitives, Textures, Clock) for deterministic testing and
 * zero-dependency offline execution.
 */

export const FrontSide = 0;
export const BackSide = 1;
export const DoubleSide = 2;
export const NormalBlending = 1;
export const AdditiveBlending = 2;
export const PCFSoftShadowMap = 2;
export const ACESFilmicToneMapping = 4;
export const SRGBColorSpace = 'srgb';
export const RepeatWrapping = 1000;
export const ClampToEdgeWrapping = 1001;

export const MathUtils = {
  DEG2RAD: Math.PI / 180,
  RAD2DEG: 180 / Math.PI,
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },
  lerp(x: number, y: number, t: number): number {
    return (1 - t) * x + t * y;
  },
  degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },
  radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  },
  randFloat(low: number, high: number): number {
    return low + Math.random() * (high - low);
  },
  randFloatSpread(range: number): number {
    return range * (0.5 - Math.random());
  }
};

export class Vector2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
  add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }
  length(): number {
    return Math.hypot(this.x, this.y);
  }
  normalize(): this {
    const l = this.length();
    if (l > 1e-8) {
      this.x /= l;
      this.y /= l;
    }
    return this;
  }
}

export class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setScalar(s: number): this {
    this.x = s;
    this.y = s;
    this.z = s;
    return this;
  }
  copy(v: { x: number; y: number; z: number }): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
  add(v: { x: number; y: number; z: number }): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  addVectors(a: Vector3, b: Vector3): this {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }
  addScaledVector(v: Vector3, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }
  sub(v: { x: number; y: number; z: number }): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  subVectors(a: Vector3, b: Vector3): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
  multiply(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }
  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  divideScalar(s: number): this {
    if (Math.abs(s) > 1e-9) {
      this.x /= s;
      this.y /= s;
      this.z /= s;
    }
    return this;
  }
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }
  applyEuler(euler: Euler): this {
    const q = new Quaternion().setFromEuler(euler);
    return this.applyQuaternion(q);
  }
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v: Vector3): this {
    const ax = this.x, ay = this.y, az = this.z;
    this.x = ay * v.z - az * v.y;
    this.y = az * v.x - ax * v.z;
    this.z = ax * v.y - ay * v.x;
    return this;
  }
  crossVectors(a: Vector3, b: Vector3): this {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }
  distanceTo(v: Vector3): number {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  normalize(): this {
    const l = this.length();
    if (l > 1e-8) {
      this.x /= l;
      this.y /= l;
      this.z /= l;
    }
    return this;
  }
  lerp(v: Vector3, alpha: number): this {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
  lerpVectors(v1: Vector3, v2: Vector3, alpha: number): this {
    this.x = v1.x + (v2.x - v1.x) * alpha;
    this.y = v1.y + (v2.y - v1.y) * alpha;
    this.z = v1.z + (v2.z - v1.z) * alpha;
    return this;
  }
  min(v: Vector3): this {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }
  max(v: Vector3): this {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }
  clamp(minVal: Vector3, maxVal: Vector3): this {
    this.x = Math.max(minVal.x, Math.min(maxVal.x, this.x));
    this.y = Math.max(minVal.y, Math.min(maxVal.y, this.y));
    this.z = Math.max(minVal.z, Math.min(maxVal.z, this.z));
    return this;
  }
  applyQuaternion(q: Quaternion): this {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }
  applyAxisAngle(axis: Vector3, angle: number): this {
    const q = new Quaternion().setFromAxisAngle(axis, angle);
    return this.applyQuaternion(q);
  }
  applyMatrix4(m: Matrix4): this {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  transformDirection(m: Matrix4): this {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }
  equals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }
}

export class Euler {
  x: number;
  y: number;
  z: number;
  order: string;
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }
  set(x: number, y: number, z: number, order = this.order): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
    return this;
  }
  copy(e: Euler): this {
    this.x = e.x;
    this.y = e.y;
    this.z = e.z;
    this.order = e.order;
    return this;
  }
  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }
  setFromQuaternion(q: Quaternion, order = this.order): this {
    const m = new Matrix4().makeRotationFromQuaternion(q);
    return this.setFromRotationMatrix(m, order);
  }
  setFromRotationMatrix(m: Matrix4, order = this.order): this {
    const te = m.elements;
    const m11 = te[0], m12 = te[4], m13 = te[8];
    const m21 = te[1], m22 = te[5], m23 = te[9];
    const m31 = te[2], m32 = te[6], m33 = te[10];
    this.order = order;
    if (order === 'YXZ') {
      this.x = Math.asin(-MathUtils.clamp(m23, -1, 1));
      if (Math.abs(m23) < 0.9999999) {
        this.y = Math.atan2(m13, m33);
        this.z = Math.atan2(m21, m22);
      } else {
        this.y = Math.atan2(-m31, m11);
        this.z = 0;
      }
    } else {
      this.y = Math.asin(MathUtils.clamp(m13, -1, 1));
      if (Math.abs(m13) < 0.9999999) {
        this.x = Math.atan2(-m23, m33);
        this.z = Math.atan2(-m12, m11);
      } else {
        this.x = Math.atan2(m32, m22);
        this.z = 0;
      }
    }
    return this;
  }
}

export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  copy(q: Quaternion): this {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }
  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
  identity(): this {
    return this.set(0, 0, 0, 1);
  }
  setFromEuler(euler: Euler): this {
    const x = euler.x, y = euler.y, z = euler.z, order = euler.order;
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    if (order === 'YXZ') {
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 - s1 * s2 * c3;
      this.w = c1 * c2 * c3 + s1 * s2 * s3;
    } else {
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
    }
    return this;
  }
  setFromAxisAngle(axis: Vector3, angle: number): this {
    const half = angle / 2;
    const s = Math.sin(half);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(half);
    return this;
  }
  setFromRotationMatrix(m: Matrix4): this {
    const te = m.elements;
    const m11 = te[0], m12 = te[4], m13 = te[8];
    const m21 = te[1], m22 = te[5], m23 = te[9];
    const m31 = te[2], m32 = te[6], m33 = te[10];
    const trace = m11 + m22 + m33;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      this.w = 0.25 / s;
      this.x = (m32 - m23) * s;
      this.y = (m13 - m31) * s;
      this.z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
      this.w = (m32 - m23) / s;
      this.x = 0.25 * s;
      this.y = (m12 + m21) / s;
      this.z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
      this.w = (m13 - m31) / s;
      this.x = (m12 + m21) / s;
      this.y = 0.25 * s;
      this.z = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
      this.w = (m21 - m12) / s;
      this.x = (m13 + m31) / s;
      this.y = (m23 + m32) / s;
      this.z = 0.25 * s;
    }
    return this.normalize();
  }
  multiply(q: Quaternion): this {
    const qax = this.x, qay = this.y, qaz = this.z, qaw = this.w;
    const qbx = q.x, qby = q.y, qbz = q.z, qbw = q.w;
    this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  }
  normalize(): this {
    const l = Math.hypot(this.x, this.y, this.z, this.w);
    if (l === 0) {
      this.x = 0; this.y = 0; this.z = 0; this.w = 1;
    } else {
      this.x /= l; this.y /= l; this.z /= l; this.w /= l;
    }
    return this;
  }
  slerp(qb: Quaternion, t: number): this {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);
    this.x += (qb.x - this.x) * t;
    this.y += (qb.y - this.y) * t;
    this.z += (qb.z - this.z) * t;
    this.w += (qb.w - this.w) * t;
    return this.normalize();
  }
}

export class Matrix4 {
  elements: number[];
  constructor() {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }
  identity(): this {
    const te = this.elements;
    te[0] = 1; te[4] = 0; te[8] = 0; te[12] = 0;
    te[1] = 0; te[5] = 1; te[9] = 0; te[13] = 0;
    te[2] = 0; te[6] = 0; te[10] = 1; te[14] = 0;
    te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
    return this;
  }
  copy(m: Matrix4): this {
    for (let i = 0; i < 16; i++) this.elements[i] = m.elements[i];
    return this;
  }
  clone(): Matrix4 {
    return new Matrix4().copy(this);
  }
  multiply(m: Matrix4): this {
    return this.multiplyMatrices(this, m);
  }
  multiplyMatrices(a: Matrix4, b: Matrix4): this {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const te = this.elements;
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = scale.x, sy = scale.y, sz = scale.z;

    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;

    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;

    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;

    te[12] = position.x;
    te[13] = position.y;
    te[14] = position.z;
    te[15] = 1;
    return this;
  }
  makeRotationFromQuaternion(q: Quaternion): this {
    return this.compose(new Vector3(0, 0, 0), q, new Vector3(1, 1, 1));
  }
  makeTranslation(x: number, y: number, z: number): this {
    this.identity();
    this.elements[12] = x;
    this.elements[13] = y;
    this.elements[14] = z;
    return this;
  }
  makeScale(x: number, y: number, z: number): this {
    this.identity();
    this.elements[0] = x;
    this.elements[5] = y;
    this.elements[10] = z;
    return this;
  }
  makePerspective(fovRad: number, aspect: number, near: number, far: number): this {
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);
    const te = this.elements;
    te[0] = f / (aspect || 1);
    te[1] = 0; te[2] = 0; te[3] = 0;
    te[4] = 0;
    te[5] = f;
    te[6] = 0; te[7] = 0;
    te[8] = 0; te[9] = 0;
    te[10] = (far + near) * nf;
    te[11] = -1;
    te[12] = 0; te[13] = 0;
    te[14] = 2 * far * near * nf;
    te[15] = 0;
    return this;
  }
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
    const z = new Vector3().subVectors(eye, target);
    if (z.lengthSq() === 0) z.z = 1;
    z.normalize();
    const x = new Vector3().crossVectors(up, z);
    if (x.lengthSq() === 0) {
      if (Math.abs(up.z) === 1) z.x += 0.0001;
      else z.z += 0.0001;
      z.normalize();
      x.crossVectors(up, z);
    }
    x.normalize();
    const y = new Vector3().crossVectors(z, x);
    const te = this.elements;
    te[0] = x.x; te[4] = y.x; te[8] = z.x;
    te[1] = x.y; te[5] = y.y; te[9] = z.y;
    te[2] = x.z; te[6] = y.z; te[10] = z.z;
    return this;
  }
  invert(): this {
    const te = this.elements;
    const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
    const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
    const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
    const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return this.identity();
    const detInv = 1 / det;

    te[0] = t11 * detInv;
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

    te[4] = t12 * detInv;
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

    te[8] = t13 * detInv;
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

    te[12] = t14 * detInv;
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
    return this;
  }
}

export class Color {
  r = 1;
  g = 1;
  b = 1;
  constructor(color?: number | string | Color, g?: number, b?: number) {
    if (typeof color === 'number' && g !== undefined && b !== undefined) {
      this.setRGB(color, g, b);
    } else if (color !== undefined) {
      this.set(color);
    }
  }
  set(value: number | string | Color): this {
    if (value instanceof Color) {
      return this.copy(value);
    } else if (typeof value === 'number') {
      return this.setHex(value);
    } else if (typeof value === 'string') {
      return this.setStyle(value);
    }
    return this;
  }
  setHex(hex: number): this {
    hex = Math.floor(hex);
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }
  setRGB(r: number, g: number, b: number): this {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }
  setStyle(style: string): this {
    const s = style.trim();
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      if (hex.length === 3) {
        this.r = parseInt(hex[0] + hex[0], 16) / 255;
        this.g = parseInt(hex[1] + hex[1], 16) / 255;
        this.b = parseInt(hex[2] + hex[2], 16) / 255;
      } else if (hex.length >= 6) {
        this.setHex(parseInt(hex.slice(0, 6), 16));
      }
    }
    return this;
  }
  copy(c: Color): this {
    this.r = c.r;
    this.g = c.g;
    this.b = c.b;
    return this;
  }
  clone(): Color {
    return new Color(this.r, this.g, this.b);
  }
  getHex(): number {
    return (
      (Math.round(MathUtils.clamp(this.r, 0, 1) * 255) << 16) ^
      (Math.round(MathUtils.clamp(this.g, 0, 1) * 255) << 8) ^
      (Math.round(MathUtils.clamp(this.b, 0, 1) * 255) << 0)
    );
  }
  lerp(c: Color, alpha: number): this {
    this.r += (c.r - this.r) * alpha;
    this.g += (c.g - this.g) * alpha;
    this.b += (c.b - this.b) * alpha;
    return this;
  }
}

export class Box3 {
  min: Vector3;
  max: Vector3;
  constructor(
    min = new Vector3(+Infinity, +Infinity, +Infinity),
    max = new Vector3(-Infinity, -Infinity, -Infinity)
  ) {
    this.min = min;
    this.max = max;
  }
  set(min: Vector3, max: Vector3): this {
    this.min.copy(min);
    this.max.copy(max);
    return this;
  }
  makeEmpty(): this {
    this.min.set(+Infinity, +Infinity, +Infinity);
    this.max.set(-Infinity, -Infinity, -Infinity);
    return this;
  }
  isEmpty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }
  copy(box: Box3): this {
    this.min.copy(box.min);
    this.max.copy(box.max);
    return this;
  }
  clone(): Box3 {
    return new Box3().copy(this);
  }
  setFromCenterAndSize(center: Vector3, size: Vector3): this {
    const hx = size.x * 0.5, hy = size.y * 0.5, hz = size.z * 0.5;
    this.min.set(center.x - hx, center.y - hy, center.z - hz);
    this.max.set(center.x + hx, center.y + hy, center.z + hz);
    return this;
  }
  expandByPoint(point: Vector3): this {
    this.min.min(point);
    this.max.max(point);
    return this;
  }
  expandByScalar(scalar: number): this {
    this.min.x -= scalar;
    this.min.y -= scalar;
    this.min.z -= scalar;
    this.max.x += scalar;
    this.max.y += scalar;
    this.max.z += scalar;
    return this;
  }
  containsPoint(point: Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }
  intersectsBox(box: Box3): boolean {
    return (
      box.max.x >= this.min.x && box.min.x <= this.max.x &&
      box.max.y >= this.min.y && box.min.y <= this.max.y &&
      box.max.z >= this.min.z && box.min.z <= this.max.z
    );
  }
  getCenter(target = new Vector3()): Vector3 {
    return target.set(
      (this.min.x + this.max.x) * 0.5,
      (this.min.y + this.max.y) * 0.5,
      (this.min.z + this.max.z) * 0.5
    );
  }
  getSize(target = new Vector3()): Vector3 {
    return target.set(
      this.max.x - this.min.x,
      this.max.y - this.min.y,
      this.max.z - this.min.z
    );
  }
  setFromObject(object: Object3D): this {
    this.makeEmpty();
    object.updateMatrixWorld(true);
    object.traverse((node) => {
      if (node instanceof Mesh && node.geometry) {
        const pos = node.geometry.attributes.position;
        if (pos) {
          const v = new Vector3();
          for (let i = 0; i < pos.count; i++) {
            v.set(
              pos.array[i * 3],
              pos.array[i * 3 + 1],
              pos.array[i * 3 + 2]
            ).applyMatrix4(node.matrixWorld);
            this.expandByPoint(v);
          }
        }
      }
    });
    return this;
  }
  applyMatrix4(matrix: Matrix4): this {
    if (this.isEmpty()) return this;
    const points = [
      new Vector3(this.min.x, this.min.y, this.min.z),
      new Vector3(this.min.x, this.min.y, this.max.z),
      new Vector3(this.min.x, this.max.y, this.min.z),
      new Vector3(this.min.x, this.max.y, this.max.z),
      new Vector3(this.max.x, this.min.y, this.min.z),
      new Vector3(this.max.x, this.min.y, this.max.z),
      new Vector3(this.max.x, this.max.y, this.min.z),
      new Vector3(this.max.x, this.max.y, this.max.z)
    ];
    this.makeEmpty();
    for (const p of points) {
      p.applyMatrix4(matrix);
      this.expandByPoint(p);
    }
    return this;
  }
}

export class Ray {
  origin: Vector3;
  direction: Vector3;
  constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
    this.origin = origin;
    this.direction = direction;
  }
  set(origin: Vector3, direction: Vector3): this {
    this.origin.copy(origin);
    this.direction.copy(direction).normalize();
    return this;
  }
  copy(ray: Ray): this {
    this.origin.copy(ray.origin);
    this.direction.copy(ray.direction);
    return this;
  }
  clone(): Ray {
    return new Ray().copy(this);
  }
  at(t: number, target = new Vector3()): Vector3 {
    return target.copy(this.origin).addScaledVector(this.direction, t);
  }
  applyMatrix4(matrix4: Matrix4): this {
    this.origin.applyMatrix4(matrix4);
    this.direction.transformDirection(matrix4);
    return this;
  }
  intersectBox(box: Box3, target = new Vector3()): Vector3 | null {
    let tmin: number, tmax: number, tymin: number, tymax: number, tzmin: number, tzmax: number;
    const invdirx = 1 / (this.direction.x || 1e-12);
    const invdiry = 1 / (this.direction.y || 1e-12);
    const invdirz = 1 / (this.direction.z || 1e-12);
    const origin = this.origin;

    if (invdirx >= 0) {
      tmin = (box.min.x - origin.x) * invdirx;
      tmax = (box.max.x - origin.x) * invdirx;
    } else {
      tmin = (box.max.x - origin.x) * invdirx;
      tmax = (box.min.x - origin.x) * invdirx;
    }

    if (invdiry >= 0) {
      tymin = (box.min.y - origin.y) * invdiry;
      tymax = (box.max.y - origin.y) * invdiry;
    } else {
      tymin = (box.max.y - origin.y) * invdiry;
      tymax = (box.min.y - origin.y) * invdiry;
    }

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin || isNaN(tmin)) tmin = tymin;
    if (tymax < tmax || isNaN(tmax)) tmax = tymax;

    if (invdirz >= 0) {
      tzmin = (box.min.z - origin.z) * invdirz;
      tzmax = (box.max.z - origin.z) * invdirz;
    } else {
      tzmin = (box.max.z - origin.z) * invdirz;
      tzmax = (box.min.z - origin.z) * invdirz;
    }

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin || isNaN(tmin)) tmin = tzmin;
    if (tzmax < tmax || isNaN(tmax)) tmax = tzmax;
    if (tmax < 0) return null;

    return this.at(tmin >= 0 ? tmin : tmax, target);
  }
  intersectTriangle(a: Vector3, b: Vector3, c: Vector3, backfaceCulling: boolean, target = new Vector3()): Vector3 | null {
    const edge1 = new Vector3().subVectors(b, a);
    const edge2 = new Vector3().subVectors(c, a);
    const normal = new Vector3().crossVectors(edge1, edge2);
    let DdN = this.direction.dot(normal);
    let sign: number;
    if (DdN > 0) {
      if (backfaceCulling) return null;
      sign = 1;
    } else if (DdN < 0) {
      sign = -1;
      DdN = -DdN;
    } else {
      return null;
    }
    const diff = new Vector3().subVectors(this.origin, a);
    const DdQxE2 = sign * this.direction.dot(new Vector3().crossVectors(diff, edge2));
    if (DdQxE2 < 0) return null;
    const DdE1xQ = sign * this.direction.dot(new Vector3().crossVectors(edge1, diff));
    if (DdE1xQ < 0) return null;
    if (DdQxE2 + DdE1xQ > DdN) return null;
    const QdN = -sign * diff.dot(normal);
    if (QdN < 0) return null;
    return this.at(QdN / DdN, target);
  }
}

export interface Intersection {
  distance: number;
  point: Vector3;
  object: Object3D;
  face?: { normal: Vector3 };
}

export class Raycaster {
  ray: Ray;
  near: number;
  far: number;
  constructor(origin?: Vector3, direction?: Vector3, near = 0, far = Infinity) {
    this.ray = new Ray(origin, direction);
    this.near = near;
    this.far = far;
  }
  set(origin: Vector3, direction: Vector3): void {
    this.ray.set(origin, direction);
  }
  setFromCamera(coords: { x: number; y: number }, camera: PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
    this.ray.direction
      .set(coords.x, coords.y, 0.5)
      .unproject(camera)
      .sub(this.ray.origin)
      .normalize();
  }
  intersectObject(object: Object3D, recursive = true, intersects: Intersection[] = []): Intersection[] {
    if (!object.visible) return intersects;
    object.updateMatrixWorld();
    if (object instanceof Mesh && object.geometry) {
      object.geometry.computeBoundingBox();
      const bbox = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
      const boxHit = this.ray.intersectBox(bbox);
      if (boxHit) {
        const invMat = object.matrixWorld.clone().invert();
        const localRay = this.ray.clone().applyMatrix4(invMat);
        const posAttr = object.geometry.attributes.position;
        const idxAttr = object.geometry.index;
        let hitFound = false;

        if (posAttr && idxAttr) {
          const a = new Vector3(), b = new Vector3(), c = new Vector3();
          const hitPt = new Vector3();
          for (let i = 0; i < idxAttr.count; i += 3) {
            const ia = idxAttr.array[i] * 3;
            const ib = idxAttr.array[i + 1] * 3;
            const ic = idxAttr.array[i + 2] * 3;
            a.set(posAttr.array[ia], posAttr.array[ia + 1], posAttr.array[ia + 2]);
            b.set(posAttr.array[ib], posAttr.array[ib + 1], posAttr.array[ib + 2]);
            c.set(posAttr.array[ic], posAttr.array[ic + 1], posAttr.array[ic + 2]);
            if (localRay.intersectTriangle(a, b, c, false, hitPt)) {
              const worldPt = hitPt.clone().applyMatrix4(object.matrixWorld);
              const dist = this.ray.origin.distanceTo(worldPt);
              if (dist >= this.near && dist <= this.far) {
                const edge1 = new Vector3().subVectors(b, a);
                const edge2 = new Vector3().subVectors(c, a);
                const normal = new Vector3().crossVectors(edge1, edge2).transformDirection(object.matrixWorld);
                intersects.push({
                  distance: dist,
                  point: worldPt,
                  object,
                  face: { normal }
                });
                hitFound = true;
              }
            }
          }
        }
        if (!hitFound) {
          const dist = this.ray.origin.distanceTo(boxHit);
          if (dist >= this.near && dist <= this.far) {
            intersects.push({
              distance: dist,
              point: boxHit.clone(),
              object,
              face: { normal: new Vector3(0, 1, 0) }
            });
          }
        }
      }
    }
    if (recursive) {
      for (const child of object.children) {
        this.intersectObject(child, true, intersects);
      }
    }
    intersects.sort((x, y) => x.distance - y.distance);
    return intersects;
  }
  intersectObjects(objects: Object3D[], recursive = true, intersects: Intersection[] = []): Intersection[] {
    for (const obj of objects) {
      this.intersectObject(obj, recursive, intersects);
    }
    intersects.sort((x, y) => x.distance - y.distance);
    return intersects;
  }
}

// Add helper methods to Vector3 that depend on Matrix4 / Camera
declare module './three.ts' {
  interface Vector3 {
    setFromMatrixPosition(m: Matrix4): this;
    unproject(camera: PerspectiveCamera): this;
  }
}
(Vector3.prototype as any).setFromMatrixPosition = function (m: Matrix4) {
  this.x = m.elements[12];
  this.y = m.elements[13];
  this.z = m.elements[14];
  return this;
};
(Vector3.prototype as any).unproject = function (camera: PerspectiveCamera) {
  const invProj = camera.projectionMatrix.clone().invert();
  return this.applyMatrix4(invProj).applyMatrix4(camera.matrixWorld);
};

let nextObjectId = 1;

export class Object3D {
  id: number;
  uuid: string;
  name = '';
  type = 'Object3D';
  parent: Object3D | null = null;
  children: Object3D[] = [];
  position = new Vector3();
  rotation = new Euler();
  quaternion = new Quaternion();
  scale = new Vector3(1, 1, 1);
  up = new Vector3(0, 1, 0);
  matrix = new Matrix4();
  matrixWorld = new Matrix4();
  visible = true;
  castShadow = false;
  receiveShadow = false;
  frustumCulled = true;
  renderOrder = 0;
  userData: Record<string, any> = {};

  private _lastEulerX = 0;
  private _lastEulerY = 0;
  private _lastEulerZ = 0;

  constructor() {
    this.id = nextObjectId++;
    this.uuid = `obj-${this.id}`;
  }

  add(...objects: Object3D[]): this {
    for (const obj of objects) {
      if (!obj || obj === this) continue;
      if (obj.parent) obj.parent.remove(obj);
      obj.parent = this;
      this.children.push(obj);
    }
    return this;
  }

  remove(...objects: Object3D[]): this {
    for (const obj of objects) {
      const idx = this.children.indexOf(obj);
      if (idx !== -1) {
        obj.parent = null;
        this.children.splice(idx, 1);
      }
    }
    return this;
  }

  clear(): this {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children.length = 0;
    return this;
  }

  traverse(callback: (object: Object3D) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  syncRotationQuaternion(): void {
    if (
      this.rotation.x !== this._lastEulerX ||
      this.rotation.y !== this._lastEulerY ||
      this.rotation.z !== this._lastEulerZ
    ) {
      this.quaternion.setFromEuler(this.rotation);
      this._lastEulerX = this.rotation.x;
      this._lastEulerY = this.rotation.y;
      this._lastEulerZ = this.rotation.z;
    }
  }

  updateMatrix(): void {
    this.syncRotationQuaternion();
    this.matrix.compose(this.position, this.quaternion, this.scale);
  }

  updateMatrixWorld(force = false): void {
    this.updateMatrix();
    if (!this.parent) {
      this.matrixWorld.copy(this.matrix);
    } else {
      this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    }
    for (const child of this.children) {
      child.updateMatrixWorld(force);
    }
  }

  getWorldPosition(target = new Vector3()): Vector3 {
    this.updateMatrixWorld(true);
    return target.set(
      this.matrixWorld.elements[12],
      this.matrixWorld.elements[13],
      this.matrixWorld.elements[14]
    );
  }

  getWorldDirection(target = new Vector3()): Vector3 {
    this.updateMatrixWorld(true);
    const e = this.matrixWorld.elements;
    return target.set(-e[8], -e[9], -e[10]).normalize();
  }

  lookAt(x: number | Vector3, y?: number, z?: number): void {
    const target = x instanceof Vector3 ? x : new Vector3(x, y ?? 0, z ?? 0);
    const pos = this.getWorldPosition(new Vector3());
    const m = new Matrix4();
    if (this instanceof PerspectiveCamera || this.type === 'Camera') {
      m.lookAt(pos, target, this.up);
    } else {
      m.lookAt(target, pos, this.up);
    }
    this.quaternion.setFromRotationMatrix(m);
    this.rotation.setFromQuaternion(this.quaternion, this.rotation.order);
    this._lastEulerX = this.rotation.x;
    this._lastEulerY = this.rotation.y;
    this._lastEulerZ = this.rotation.z;
  }

  clone(recursive = true): this {
    const cloned = new (this.constructor as any)();
    cloned.name = this.name;
    cloned.position.copy(this.position);
    cloned.rotation.copy(this.rotation);
    cloned.quaternion.copy(this.quaternion);
    cloned.scale.copy(this.scale);
    cloned.visible = this.visible;
    cloned.userData = { ...this.userData };
    if (recursive) {
      for (const c of this.children) {
        cloned.add(c.clone(true));
      }
    }
    return cloned;
  }
}

export class Group extends Object3D {
  constructor() {
    super();
    this.type = 'Group';
  }
}

export class Fog {
  color: Color;
  near: number;
  far: number;
  constructor(color: number | string | Color, near = 1, far = 1000) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  }
}

export class FogExp2 {
  color: Color;
  density: number;
  constructor(color: number | string | Color, density = 0.01) {
    this.color = new Color(color);
    this.density = density;
  }
}

export class Scene extends Object3D {
  background: Color | null = null;
  fog: Fog | FogExp2 | null = null;
  constructor() {
    super();
    this.type = 'Scene';
  }
}

export class PerspectiveCamera extends Object3D {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  projectionMatrix = new Matrix4();
  matrixWorldInverse = new Matrix4();
  constructor(fov = 75, aspect = 1, near = 0.1, far = 1000) {
    super();
    this.type = 'PerspectiveCamera';
    this.rotation.order = 'YXZ';
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }
  updateProjectionMatrix(): void {
    this.projectionMatrix.makePerspective(
      MathUtils.degToRad(this.fov),
      this.aspect,
      this.near,
      this.far
    );
  }
  updateMatrixWorld(force = false): void {
    super.updateMatrixWorld(force);
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }
}

export class BufferAttribute {
  array: Float32Array | Uint16Array | Uint32Array;
  itemSize: number;
  count: number;
  needsUpdate = false;
  constructor(array: Float32Array | Uint16Array | Uint32Array | number[], itemSize: number) {
    this.array = Array.isArray(array) ? new Float32Array(array) : array;
    this.itemSize = itemSize;
    this.count = Math.floor(this.array.length / itemSize);
  }
  setXYZ(index: number, x: number, y: number, z: number): this {
    const i = index * this.itemSize;
    this.array[i] = x;
    this.array[i + 1] = y;
    this.array[i + 2] = z;
    this.needsUpdate = true;
    return this;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(array: Float32Array | number[], itemSize: number) {
    super(array instanceof Float32Array ? array : new Float32Array(array), itemSize);
  }
}

export class BufferGeometry {
  attributes: Record<string, BufferAttribute> = {};
  index: BufferAttribute | null = null;
  boundingBox: Box3 | null = null;
  _glBuffers?: {
    pos?: WebGLBuffer | null;
    norm?: WebGLBuffer | null;
    uv?: WebGLBuffer | null;
    idx?: WebGLBuffer | null;
    idxCount?: number;
    idxType?: number;
  };

  setAttribute(name: string, attribute: BufferAttribute): this {
    this.attributes[name] = attribute;
    return this;
  }
  getAttribute(name: string): BufferAttribute | undefined {
    return this.attributes[name];
  }
  setIndex(index: BufferAttribute | number[]): this {
    if (Array.isArray(index)) {
      this.index = new BufferAttribute(new Uint16Array(index), 1);
    } else {
      this.index = index;
    }
    return this;
  }
  setFromPoints(points: Vector3[]): this {
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      arr[i * 3] = points[i].x;
      arr[i * 3 + 1] = points[i].y;
      arr[i * 3 + 2] = points[i].z;
    }
    this.setAttribute('position', new BufferAttribute(arr, 3));
    return this;
  }
  computeBoundingBox(): void {
    if (!this.boundingBox) this.boundingBox = new Box3();
    this.boundingBox.makeEmpty();
    const pos = this.attributes.position;
    if (pos) {
      const v = new Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.set(pos.array[i * 3], pos.array[i * 3 + 1], pos.array[i * 3 + 2]);
        this.boundingBox.expandByPoint(v);
      }
    } else {
      this.boundingBox.set(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
    }
  }
  computeVertexNormals(): void {
    // Already computed on primitives
  }
  dispose(): void {
    this._glBuffers = undefined;
  }
}

export class BoxGeometry extends BufferGeometry {
  parameters: { width: number; height: number; depth: number };
  constructor(width = 1, height = 1, depth = 1) {
    super();
    this.parameters = { width, height, depth };
    const hx = width / 2, hy = height / 2, hz = depth / 2;
    const positions = new Float32Array([
      // Front (+Z)
      -hx, -hy,  hz,   hx, -hy,  hz,   hx,  hy,  hz,  -hx,  hy,  hz,
      // Back (-Z)
       hx, -hy, -hz,  -hx, -hy, -hz,  -hx,  hy, -hz,   hx,  hy, -hz,
      // Top (+Y)
      -hx,  hy,  hz,   hx,  hy,  hz,   hx,  hy, -hz,  -hx,  hy, -hz,
      // Bottom (-Y)
      -hx, -hy, -hz,   hx, -hy, -hz,   hx, -hy,  hz,  -hx, -hy,  hz,
      // Right (+X)
       hx, -hy,  hz,   hx, -hy, -hz,   hx,  hy, -hz,   hx,  hy,  hz,
      // Left (-X)
      -hx, -hy, -hz,  -hx, -hy,  hz,  -hx,  hy,  hz,  -hx,  hy, -hz
    ]);
    const normals = new Float32Array([
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
     -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
    ]);
    const uvs = new Float32Array([
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1,
      0,0, 1,0, 1,1, 0,1
    ]);
    const indices = new Uint16Array([
      0, 1, 2,  0, 2, 3,
      4, 5, 6,  4, 6, 7,
      8, 9,10,  8,10,11,
     12,13,14, 12,14,15,
     16,17,18, 16,18,19,
     20,21,22, 20,22,23
    ]);
    this.setAttribute('position', new BufferAttribute(positions, 3));
    this.setAttribute('normal', new BufferAttribute(normals, 3));
    this.setAttribute('uv', new BufferAttribute(uvs, 2));
    this.setIndex(new BufferAttribute(indices, 1));
    this.computeBoundingBox();
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1) {
    super();
    const hx = width / 2, hy = height / 2;
    const positions = new Float32Array([
      -hx, -hy, 0,
       hx, -hy, 0,
       hx,  hy, 0,
      -hx,  hy, 0
    ]);
    const normals = new Float32Array([
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1
    ]);
    const uvs = new Float32Array([
      0, 0,  1, 0,  1, 1,  0, 1
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this.setAttribute('position', new BufferAttribute(positions, 3));
    this.setAttribute('normal', new BufferAttribute(normals, 3));
    this.setAttribute('uv', new BufferAttribute(uvs, 2));
    this.setIndex(new BufferAttribute(indices, 1));
    this.computeBoundingBox();
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 12) {
    super();
    const segs = Math.max(6, radialSegments);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const hy = height / 2;

    for (let y = 0; y <= 1; y++) {
      const v = y;
      const r = y === 0 ? radiusTop : radiusBottom;
      const py = y === 0 ? hy : -hy;
      for (let x = 0; x <= segs; x++) {
        const u = x / segs;
        const theta = u * Math.PI * 2;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);
        positions.push(r * sinT, py, r * cosT);
        normals.push(sinT, 0, cosT);
        uvs.push(u, 1 - v);
      }
    }
    for (let x = 0; x < segs; x++) {
      const a = x;
      const b = x + segs + 1;
      const c = x + segs + 2;
      const d = x + 1;
      indices.push(a, b, d, b, c, d);
    }

    // Top cap
    if (radiusTop > 0) {
      const centerIdx = positions.length / 3;
      positions.push(0, hy, 0);
      normals.push(0, 1, 0);
      uvs.push(0.5, 0.5);
      for (let x = 0; x <= segs; x++) {
        const theta = (x / segs) * Math.PI * 2;
        positions.push(radiusTop * Math.sin(theta), hy, radiusTop * Math.cos(theta));
        normals.push(0, 1, 0);
        uvs.push(0.5 + 0.5 * Math.sin(theta), 0.5 + 0.5 * Math.cos(theta));
      }
      for (let x = 0; x < segs; x++) {
        indices.push(centerIdx, centerIdx + 1 + x, centerIdx + 2 + x);
      }
    }

    this.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
    this.computeBoundingBox();
  }
}

export class ConeGeometry extends CylinderGeometry {
  constructor(radius = 1, height = 1, radialSegments = 12) {
    super(0, radius, height, radialSegments);
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 12, heightSegments = 8) {
    super();
    const wSegs = Math.max(6, widthSegments);
    const hSegs = Math.max(4, heightSegments);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= hSegs; y++) {
      const v = y / hSegs;
      const phi = v * Math.PI;
      for (let x = 0; x <= wSegs; x++) {
        const u = x / wSegs;
        const theta = u * Math.PI * 2;
        const nx = -Math.cos(theta) * Math.sin(phi);
        const ny = Math.cos(phi);
        const nz = Math.sin(theta) * Math.sin(phi);
        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < hSegs; y++) {
      for (let x = 0; x < wSegs; x++) {
        const a = y * (wSegs + 1) + x + 1;
        const b = y * (wSegs + 1) + x;
        const c = (y + 1) * (wSegs + 1) + x;
        const d = (y + 1) * (wSegs + 1) + x + 1;
        indices.push(a, b, d, b, c, d);
      }
    }
    this.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    this.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
    this.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    this.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
    this.computeBoundingBox();
  }
}

export class CapsuleGeometry extends CylinderGeometry {
  constructor(radius = 0.5, length = 1, _capSegments = 4, radialSegments = 12) {
    super(radius, radius, length + radius * 2, radialSegments);
  }
}

export class RingGeometry extends PlaneGeometry {
  constructor(innerRadius = 0.5, outerRadius = 1) {
    super(outerRadius * 2, outerRadius * 2);
  }
}

export class Texture {
  image?: any;
  wrapS = RepeatWrapping;
  wrapT = RepeatWrapping;
  repeat = new Vector2(1, 1);
  needsUpdate = true;
  _glTex?: WebGLTexture | null;
  constructor(image?: any) {
    this.image = image;
  }
  dispose(): void {
    this._glTex = undefined;
  }
}

export class CanvasTexture extends Texture {
  constructor(canvas?: any) {
    super(canvas);
  }
}

export class Material {
  color = new Color(0xffffff);
  emissive = new Color(0x000000);
  emissiveIntensity = 1.0;
  roughness = 0.65;
  metalness = 0.15;
  opacity = 1.0;
  transparent = false;
  depthWrite = true;
  depthTest = true;
  wireframe = false;
  side = FrontSide;
  blending = NormalBlending;
  map: Texture | null = null;
  size = 0.08;

  constructor(params: Record<string, any> = {}) {
    this.setValues(params);
  }
  setValues(params: Record<string, any>): void {
    for (const key of Object.keys(params)) {
      const val = params[key];
      if (val === undefined) continue;
      if (key === 'color') this.color.set(val);
      else if (key === 'emissive') this.emissive.set(val);
      else (this as any)[key] = val;
    }
  }
  clone(): this {
    const c = new (this.constructor as any)();
    c.color.copy(this.color);
    c.emissive.copy(this.emissive);
    c.emissiveIntensity = this.emissiveIntensity;
    c.roughness = this.roughness;
    c.metalness = this.metalness;
    c.opacity = this.opacity;
    c.transparent = this.transparent;
    c.depthWrite = this.depthWrite;
    c.depthTest = this.depthTest;
    c.side = this.side;
    c.blending = this.blending;
    c.map = this.map;
    c.size = this.size;
    return c;
  }
  dispose(): void {}
}

export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {
  constructor(params: Record<string, any> = {}) {
    super({ roughness: 1.0, metalness: 0.0, ...params });
  }
}
export class MeshLambertMaterial extends Material {}
export class MeshPhongMaterial extends Material {}
export class LineBasicMaterial extends Material {}
export class SpriteMaterial extends Material {}
export class PointsMaterial extends Material {}

export class Mesh extends Object3D {
  geometry: BufferGeometry;
  material: Material;
  constructor(geometry = new BufferGeometry(), material: Material = new MeshStandardMaterial()) {
    super();
    this.type = 'Mesh';
    this.geometry = geometry;
    this.material = material;
  }
}

export class InstancedMesh extends Mesh {
  count: number;
  instanceMatrix: BufferAttribute;
  constructor(geometry: BufferGeometry, material: Material, count: number) {
    super(geometry, material);
    this.type = 'InstancedMesh';
    this.count = count;
    this.instanceMatrix = new BufferAttribute(new Float32Array(count * 16), 16);
    for (let i = 0; i < count; i++) {
      this.setMatrixAt(i, new Matrix4());
    }
  }
  setMatrixAt(index: number, matrix: Matrix4): void {
    for (let i = 0; i < 16; i++) {
      this.instanceMatrix.array[index * 16 + i] = matrix.elements[i];
    }
    this.instanceMatrix.needsUpdate = true;
  }
  getMatrixAt(index: number, matrix: Matrix4): void {
    for (let i = 0; i < 16; i++) {
      matrix.elements[i] = this.instanceMatrix.array[index * 16 + i];
    }
  }
}

export class Line extends Object3D {
  geometry: BufferGeometry;
  material: Material;
  constructor(geometry = new BufferGeometry(), material: Material = new LineBasicMaterial()) {
    super();
    this.type = 'Line';
    this.geometry = geometry;
    this.material = material;
  }
}

export class LineSegments extends Line {
  constructor(geometry = new BufferGeometry(), material: Material = new LineBasicMaterial()) {
    super(geometry, material);
    this.type = 'LineSegments';
  }
}

export class Points extends Object3D {
  geometry: BufferGeometry;
  material: Material;
  constructor(geometry = new BufferGeometry(), material: Material = new PointsMaterial()) {
    super();
    this.type = 'Points';
    this.geometry = geometry;
    this.material = material;
  }
}

export class Sprite extends Mesh {
  constructor(material: Material = new SpriteMaterial()) {
    super(new PlaneGeometry(1, 1), material);
    this.type = 'Sprite';
  }
}

export class Light extends Object3D {
  color: Color;
  intensity: number;
  constructor(color: number | string | Color = 0xffffff, intensity = 1) {
    super();
    this.type = 'Light';
    this.color = new Color(color);
    this.intensity = intensity;
  }
}

export class AmbientLight extends Light {
  constructor(color: number | string | Color = 0xffffff, intensity = 1) {
    super(color, intensity);
    this.type = 'AmbientLight';
  }
}

export class HemisphereLight extends Light {
  groundColor: Color;
  constructor(
    skyColor: number | string | Color = 0xffffff,
    groundColor: number | string | Color = 0x444444,
    intensity = 1
  ) {
    super(skyColor, intensity);
    this.type = 'HemisphereLight';
    this.groundColor = new Color(groundColor);
  }
}

export class DirectionalLight extends Light {
  target = new Object3D();
  shadow = {
    mapSize: new Vector2(2048, 2048),
    camera: { near: 0.5, far: 150, left: -60, right: 60, top: 60, bottom: -60 },
    bias: -0.0005
  };
  constructor(color: number | string | Color = 0xffffff, intensity = 1) {
    super(color, intensity);
    this.type = 'DirectionalLight';
  }
}

export class PointLight extends Light {
  distance: number;
  decay: number;
  constructor(color: number | string | Color = 0xffffff, intensity = 1, distance = 20, decay = 2) {
    super(color, intensity);
    this.type = 'PointLight';
    this.distance = distance;
    this.decay = decay;
  }
}

export class Clock {
  autoStart: boolean;
  startTime = 0;
  oldTime = 0;
  elapsedTime = 0;
  running = false;
  constructor(autoStart = true) {
    this.autoStart = autoStart;
  }
  start(): void {
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.running = true;
  }
  stop(): void {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }
  getElapsedTime(): number {
    this.getDelta();
    return this.elapsedTime;
  }
  getDelta(): number {
    let diff = 0;
    if (this.autoStart && !this.running) {
      this.start();
      return 0;
    }
    if (this.running) {
      const newTime = performance.now();
      diff = (newTime - this.oldTime) / 1000;
      this.oldTime = newTime;
      this.elapsedTime += diff;
    }
    return diff;
  }
}

const VERTEX_SHADER_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjMatrix;
uniform float uPointSize;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(uModelMatrix[0].xyz, uModelMatrix[1].xyz, uModelMatrix[2].xyz) * aNormal);
  vUv = aUv;
  gl_Position = uProjMatrix * uViewMatrix * worldPos;
  gl_PointSize = uPointSize;
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;

uniform vec3 uCameraPos;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uRoughness;
uniform float uMetalness;
uniform float uOpacity;
uniform int uUnlit;
uniform int uUseMap;
uniform sampler2D uMap;
uniform vec2 uRepeat;

uniform vec3 uDirLightDir;
uniform vec3 uDirLightColor;
uniform float uDirLightIntensity;

uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform float uAmbientIntensity;

uniform vec3 uPointPos0;
uniform vec3 uPointCol0;
uniform float uPointRange0;

uniform vec3 uPointPos1;
uniform vec3 uPointCol1;
uniform float uPointRange1;

uniform vec3 uFogColor;
uniform float uFogDensity;

void main() {
  vec3 baseColor = uColor;
  if (uUseMap == 1) {
    vec4 texCol = texture2D(uMap, fract(vUv * uRepeat));
    baseColor *= texCol.rgb;
  } else {
    // Subtle procedural architectural surface grain so geometry has depth & scale cues
    vec3 gridP = vWorldPos * 1.25;
    float gx = abs(fract(gridP.x) - 0.5);
    float gy = abs(fract(gridP.y) - 0.5);
    float gz = abs(fract(gridP.z) - 0.5);
    float seam = smoothstep(0.46, 0.5, max(gx, max(gy, gz)));
    baseColor *= (1.0 - seam * 0.08 * uRoughness);
  }

  if (uUnlit == 1) {
    gl_FragColor = vec4(baseColor + uEmissive, uOpacity);
    return;
  }

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uDirLightDir);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float hemiFactor = N.y * 0.5 + 0.5;
  vec3 ambient = mix(uGroundColor, uSkyColor, hemiFactor) * uAmbientIntensity;

  // Ground contact ambient occlusion near Y = 0
  float groundAO = clamp(0.72 + 0.28 * clamp(vWorldPos.y * 0.85, 0.0, 1.0), 0.72, 1.0);
  ambient *= groundAO;

  float shininess = mix(96.0, 8.0, clamp(uRoughness, 0.05, 1.0));
  float spec = pow(max(dot(N, H), 0.0), shininess) * (1.0 - uRoughness * 0.75) * (0.25 + uMetalness * 0.75);

  vec3 direct = uDirLightColor * uDirLightIntensity * (NdotL * baseColor + spec * mix(vec3(1.0), baseColor, uMetalness));

  // Point light 0
  vec3 pLight = vec3(0.0);
  if (uPointRange0 > 0.01) {
    vec3 d0 = uPointPos0 - vWorldPos;
    float dist0 = length(d0);
    if (dist0 < uPointRange0) {
      float att0 = pow(1.0 - dist0 / uPointRange0, 2.0);
      pLight += uPointCol0 * max(dot(N, normalize(d0)), 0.2) * att0;
    }
  }
  if (uPointRange1 > 0.01) {
    vec3 d1 = uPointPos1 - vWorldPos;
    float dist1 = length(d1);
    if (dist1 < uPointRange1) {
      float att1 = pow(1.0 - dist1 / uPointRange1, 2.0);
      pLight += uPointCol1 * max(dot(N, normalize(d1)), 0.2) * att1;
    }
  }

  vec3 litColor = baseColor * ambient + direct + pLight * baseColor + uEmissive;

  // Atmospheric exponential squared fog
  float dist = length(vWorldPos - uCameraPos);
  float fogFactor = clamp(exp(-uFogDensity * uFogDensity * dist * dist), 0.0, 1.0);
  vec3 finalColor = mix(uFogColor, litColor, fogFactor);

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

export class WebGLRenderer {
  domElement: HTMLCanvasElement;
  shadowMap = { enabled: true, type: PCFSoftShadowMap };
  toneMapping = ACESFilmicToneMapping;
  toneMappingExposure = 1.0;
  outputColorSpace = SRGBColorSpace;
  info = { render: { calls: 0, triangles: 0, frame: 0 } };

  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private attribs: Record<string, number> = {};
  private width = 1280;
  private height = 720;
  private pixelRatio = 1;

  constructor(params: { canvas?: HTMLCanvasElement; antialias?: boolean; powerPreference?: string } = {}) {
    if (params.canvas) {
      this.domElement = params.canvas;
    } else if (typeof document !== 'undefined') {
      this.domElement = document.createElement('canvas');
    } else {
      this.domElement = { width: 1280, height: 720, style: {} } as any;
    }

    if (typeof this.domElement.getContext === 'function') {
      try {
        this.gl =
          (this.domElement.getContext('webgl2', { antialias: params.antialias ?? true }) as WebGL2RenderingContext) ||
          (this.domElement.getContext('webgl', { antialias: params.antialias ?? true }) as WebGLRenderingContext);
        if (this.gl) {
          this.initShaders();
        }
      } catch {
        this.gl = null;
      }
    }
  }

  private initShaders(): void {
    const gl = this.gl;
    if (!gl) return;
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      return;
    }
    this.program = prog;
    gl.useProgram(prog);

    this.attribs.aPosition = gl.getAttribLocation(prog, 'aPosition');
    this.attribs.aNormal = gl.getAttribLocation(prog, 'aNormal');
    this.attribs.aUv = gl.getAttribLocation(prog, 'aUv');

    const uNames = [
      'uModelMatrix', 'uViewMatrix', 'uProjMatrix', 'uPointSize',
      'uCameraPos', 'uColor', 'uEmissive', 'uRoughness', 'uMetalness', 'uOpacity',
      'uUnlit', 'uUseMap', 'uMap', 'uRepeat',
      'uDirLightDir', 'uDirLightColor', 'uDirLightIntensity',
      'uSkyColor', 'uGroundColor', 'uAmbientIntensity',
      'uPointPos0', 'uPointCol0', 'uPointRange0',
      'uPointPos1', 'uPointCol1', 'uPointRange1',
      'uFogColor', 'uFogDensity'
    ];
    for (const name of uNames) {
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    }
  }

  private compileShader(type: number, src: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return null;
    }
    return shader;
  }

  setSize(width: number, height: number, updateStyle = true): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.domElement.width = Math.floor(this.width * this.pixelRatio);
    this.domElement.height = Math.floor(this.height * this.pixelRatio);
    if (updateStyle && this.domElement.style) {
      this.domElement.style.width = `${this.width}px`;
      this.domElement.style.height = `${this.height}px`;
    }
    if (this.gl) {
      this.gl.viewport(0, 0, this.domElement.width, this.domElement.height);
    }
  }

  setPixelRatio(ratio: number): void {
    this.pixelRatio = Math.max(0.5, Math.min(2, ratio));
    this.setSize(this.width, this.height, false);
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    this.info.render.frame++;
    this.info.render.calls = 0;
    this.info.render.triangles = 0;

    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.useProgram(this.program);
    gl.viewport(0, 0, this.domElement.width, this.domElement.height);

    const bg = scene.background || new Color(0x88a8c4);
    gl.clearColor(bg.r, bg.g, bg.b, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Collect lights and renderables
    let dirLight: DirectionalLight | null = null;
    let hemiLight: HemisphereLight | null = null;
    let ambLight: AmbientLight | null = null;
    const pointLights: PointLight[] = [];
    const worldRenderables: Object3D[] = [];
    const viewmodelRenderables: Object3D[] = [];
    const transparentRenderables: Object3D[] = [];

    scene.traverse((obj) => {
      if (!obj.visible) return;
      if (obj instanceof DirectionalLight && !dirLight) dirLight = obj;
      else if (obj instanceof HemisphereLight && !hemiLight) hemiLight = obj;
      else if (obj instanceof AmbientLight && !ambLight) ambLight = obj;
      else if (obj instanceof PointLight && obj.intensity > 0.01) pointLights.push(obj);
      else if (obj instanceof Mesh || obj instanceof Line || obj instanceof Points) {
        let isCameraChild = false;
        let p = obj.parent;
        while (p) {
          if (p === camera) {
            isCameraChild = true;
            break;
          }
          p = p.parent;
        }
        if (isCameraChild) {
          viewmodelRenderables.push(obj);
        } else if ((obj as Mesh).material?.transparent) {
          transparentRenderables.push(obj);
        } else {
          worldRenderables.push(obj);
        }
      }
    });

    // Also traverse camera children if camera was not added directly to scene
    if (!camera.parent) {
      camera.traverse((obj) => {
        if (!obj.visible) return;
        if (obj instanceof PointLight && obj.intensity > 0.01) pointLights.push(obj);
        else if (obj instanceof Mesh || obj instanceof Line || obj instanceof Points) {
          viewmodelRenderables.push(obj);
        }
      });
    }

    const camPos = camera.getWorldPosition(new Vector3());
    gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, new Float32Array(camera.matrixWorldInverse.elements));
    gl.uniformMatrix4fv(this.uniforms.uProjMatrix, false, new Float32Array(camera.projectionMatrix.elements));
    gl.uniform3f(this.uniforms.uCameraPos, camPos.x, camPos.y, camPos.z);

    if (dirLight) {
      const dl = dirLight as DirectionalLight;
      const dPos = dl.getWorldPosition(new Vector3()).normalize();
      gl.uniform3f(this.uniforms.uDirLightDir, dPos.x, dPos.y, dPos.z);
      gl.uniform3f(this.uniforms.uDirLightColor, dl.color.r, dl.color.g, dl.color.b);
      gl.uniform1f(this.uniforms.uDirLightIntensity, dl.intensity);
    } else {
      gl.uniform3f(this.uniforms.uDirLightDir, 0.5, 0.8, 0.3);
      gl.uniform3f(this.uniforms.uDirLightColor, 1, 0.96, 0.9);
      gl.uniform1f(this.uniforms.uDirLightIntensity, 1.1);
    }

    if (hemiLight) {
      const hl = hemiLight as HemisphereLight;
      gl.uniform3f(this.uniforms.uSkyColor, hl.color.r, hl.color.g, hl.color.b);
      gl.uniform3f(this.uniforms.uGroundColor, hl.groundColor.r, hl.groundColor.g, hl.groundColor.b);
      gl.uniform1f(this.uniforms.uAmbientIntensity, hl.intensity);
    } else if (ambLight) {
      const al = ambLight as AmbientLight;
      gl.uniform3f(this.uniforms.uSkyColor, al.color.r, al.color.g, al.color.b);
      gl.uniform3f(this.uniforms.uGroundColor, al.color.r * 0.6, al.color.g * 0.6, al.color.b * 0.6);
      gl.uniform1f(this.uniforms.uAmbientIntensity, al.intensity);
    } else {
      gl.uniform3f(this.uniforms.uSkyColor, 0.7, 0.8, 0.95);
      gl.uniform3f(this.uniforms.uGroundColor, 0.3, 0.32, 0.35);
      gl.uniform1f(this.uniforms.uAmbientIntensity, 0.65);
    }

    const p0 = pointLights[0];
    if (p0) {
      const pos0 = p0.getWorldPosition(new Vector3());
      gl.uniform3f(this.uniforms.uPointPos0, pos0.x, pos0.y, pos0.z);
      gl.uniform3f(this.uniforms.uPointCol0, p0.color.r * p0.intensity, p0.color.g * p0.intensity, p0.color.b * p0.intensity);
      gl.uniform1f(this.uniforms.uPointRange0, p0.distance || 15);
    } else {
      gl.uniform1f(this.uniforms.uPointRange0, 0);
    }

    const p1 = pointLights[1];
    if (p1) {
      const pos1 = p1.getWorldPosition(new Vector3());
      gl.uniform3f(this.uniforms.uPointPos1, pos1.x, pos1.y, pos1.z);
      gl.uniform3f(this.uniforms.uPointCol1, p1.color.r * p1.intensity, p1.color.g * p1.intensity, p1.color.b * p1.intensity);
      gl.uniform1f(this.uniforms.uPointRange1, p1.distance || 15);
    } else {
      gl.uniform1f(this.uniforms.uPointRange1, 0);
    }

    if (scene.fog instanceof FogExp2) {
      gl.uniform3f(this.uniforms.uFogColor, scene.fog.color.r, scene.fog.color.g, scene.fog.color.b);
      gl.uniform1f(this.uniforms.uFogDensity, scene.fog.density);
    } else {
      gl.uniform3f(this.uniforms.uFogColor, bg.r, bg.g, bg.b);
      gl.uniform1f(this.uniforms.uFogDensity, 0.004);
    }

    // 1. Opaque world pass
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    for (const obj of worldRenderables) {
      this.drawObject(obj);
    }

    // 2. Transparent world pass
    if (transparentRenderables.length > 0) {
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      for (const obj of transparentRenderables) {
        const mat = (obj as Mesh).material;
        if (mat?.blending === AdditiveBlending) {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        } else {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        this.drawObject(obj);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    // 3. Viewmodel pass (clear depth buffer so weapon never clips into world walls)
    if (viewmodelRenderables.length > 0) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      for (const obj of viewmodelRenderables) {
        const mat = (obj as Mesh).material;
        if (mat?.transparent) {
          gl.enable(gl.BLEND);
          if (mat.blending === AdditiveBlending) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          }
        } else {
          gl.disable(gl.BLEND);
        }
        this.drawObject(obj);
      }
      gl.disable(gl.BLEND);
    }
  }

  private drawObject(obj: Object3D): void {
    const gl = this.gl!;
    const geom = (obj as Mesh).geometry;
    const mat = (obj as Mesh).material;
    if (!geom || !mat || !geom.attributes.position) return;

    if (!geom._glBuffers || geom.attributes.position.needsUpdate) {
      this.uploadGeometry(geom);
    }
    const bufs = geom._glBuffers;
    if (!bufs || !bufs.pos) return;

    // Bind attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pos);
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);

    if (bufs.norm && this.attribs.aNormal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.norm);
      gl.enableVertexAttribArray(this.attribs.aNormal);
      gl.vertexAttribPointer(this.attribs.aNormal, 3, gl.FLOAT, false, 0, 0);
    } else if (this.attribs.aNormal >= 0) {
      gl.disableVertexAttribArray(this.attribs.aNormal);
      gl.vertexAttrib3f(this.attribs.aNormal, 0, 1, 0);
    }

    if (bufs.uv && this.attribs.aUv >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.uv);
      gl.enableVertexAttribArray(this.attribs.aUv);
      gl.vertexAttribPointer(this.attribs.aUv, 2, gl.FLOAT, false, 0, 0);
    } else if (this.attribs.aUv >= 0) {
      gl.disableVertexAttribArray(this.attribs.aUv);
      gl.vertexAttrib2f(this.attribs.aUv, 0, 0);
    }

    gl.uniform3f(this.uniforms.uColor, mat.color.r, mat.color.g, mat.color.b);
    gl.uniform3f(
      this.uniforms.uEmissive,
      mat.emissive.r * mat.emissiveIntensity,
      mat.emissive.g * mat.emissiveIntensity,
      mat.emissive.b * mat.emissiveIntensity
    );
    gl.uniform1f(this.uniforms.uRoughness, mat.roughness ?? 0.65);
    gl.uniform1f(this.uniforms.uMetalness, mat.metalness ?? 0.15);
    gl.uniform1f(this.uniforms.uOpacity, mat.opacity ?? 1.0);
    gl.uniform1i(
      this.uniforms.uUnlit,
      mat instanceof MeshBasicMaterial || obj instanceof Line || obj instanceof Points ? 1 : 0
    );
    gl.uniform1f(this.uniforms.uPointSize, Math.max(2.0, (mat.size || 0.08) * 65.0));

    if (mat.map && mat.map.image) {
      this.bindTexture(mat.map);
      gl.uniform1i(this.uniforms.uUseMap, 1);
      gl.uniform1i(this.uniforms.uMap, 0);
      gl.uniform2f(this.uniforms.uRepeat, mat.map.repeat.x, mat.map.repeat.y);
    } else {
      gl.uniform1i(this.uniforms.uUseMap, 0);
    }

    if (obj instanceof InstancedMesh) {
      const instMat = new Matrix4();
      const worldMat = new Matrix4();
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, instMat);
        worldMat.multiplyMatrices(obj.matrixWorld, instMat);
        gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, new Float32Array(worldMat.elements));
        this.issueDrawCall(obj, geom, bufs);
      }
    } else {
      gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, new Float32Array(obj.matrixWorld.elements));
      this.issueDrawCall(obj, geom, bufs);
    }
  }

  private issueDrawCall(obj: Object3D, geom: BufferGeometry, bufs: NonNullable<BufferGeometry['_glBuffers']>): void {
    const gl = this.gl!;
    this.info.render.calls++;
    if (obj instanceof LineSegments) {
      gl.drawArrays(gl.LINES, 0, geom.attributes.position.count);
    } else if (obj instanceof Line) {
      gl.drawArrays(gl.LINE_STRIP, 0, geom.attributes.position.count);
    } else if (obj instanceof Points) {
      gl.drawArrays(gl.POINTS, 0, geom.attributes.position.count);
    } else if (bufs.idx && bufs.idxCount) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);
      gl.drawElements(gl.TRIANGLES, bufs.idxCount, bufs.idxType || gl.UNSIGNED_SHORT, 0);
      this.info.render.triangles += bufs.idxCount / 3;
    } else {
      const cnt = geom.attributes.position.count;
      gl.drawArrays(gl.TRIANGLES, 0, cnt);
      this.info.render.triangles += cnt / 3;
    }
  }

  private uploadGeometry(geom: BufferGeometry): void {
    const gl = this.gl!;
    const bufs: NonNullable<BufferGeometry['_glBuffers']> = geom._glBuffers || {};

    const pos = geom.attributes.position;
    if (pos) {
      if (!bufs.pos) bufs.pos = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pos);
      gl.bufferData(gl.ARRAY_BUFFER, pos.array as Float32Array, gl.STATIC_DRAW);
      pos.needsUpdate = false;
    }

    const norm = geom.attributes.normal;
    if (norm) {
      if (!bufs.norm) bufs.norm = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.norm);
      gl.bufferData(gl.ARRAY_BUFFER, norm.array as Float32Array, gl.STATIC_DRAW);
      norm.needsUpdate = false;
    }

    const uv = geom.attributes.uv;
    if (uv) {
      if (!bufs.uv) bufs.uv = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs.uv);
      gl.bufferData(gl.ARRAY_BUFFER, uv.array as Float32Array, gl.STATIC_DRAW);
      uv.needsUpdate = false;
    }

    if (geom.index) {
      if (!bufs.idx) bufs.idx = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);
      const arr = geom.index.array instanceof Uint16Array
        ? geom.index.array
        : new Uint16Array(geom.index.array);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      bufs.idxCount = arr.length;
      bufs.idxType = gl.UNSIGNED_SHORT;
    }

    geom._glBuffers = bufs;
  }

  private bindTexture(tex: Texture): void {
    const gl = this.gl!;
    gl.activeTexture(gl.TEXTURE0);
    if (!tex._glTex || tex.needsUpdate) {
      if (!tex._glTex) tex._glTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex._glTex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      } catch {
        // Ignore non-DOM image in headless unit test mode
      }
      tex.needsUpdate = false;
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tex._glTex);
    }
  }

  dispose(): void {
    this.gl = null;
  }
}
