import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';

// Animated sphere component (no changes needed here)
function AnimatedSphere({ position, color, size, speed }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * speed + position[0]) * 0.5;
    ref.current.position.x = position[0] + Math.cos(clock.getElapsedTime() * speed + position[1]) * 0.3;
  });
  return (
    <Sphere ref={ref} args={[size, 32, 32]} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.15}
      />
    </Sphere>
  );
}

// Animated camera movement (no changes needed here)
function AnimatedCamera() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.z = 13 + Math.sin(clock.getElapsedTime() * 0.15) * 2;
      ref.current.position.x = Math.sin(clock.getElapsedTime() * 0.08) * 2;
      ref.current.lookAt(0, 0, 0);
    }
  });
  return <perspectiveCamera ref={ref} position={[0, 0, 13]} fov={75} />;
}



const Scene3D = () => {
  const canvasRef = useRef();
  const [isContextLost, setIsContextLost] = useState(false);
  // This key is used to force React to remount the Canvas on context restoration
  const [remountKey, setRemountKey] = useState(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event) => {
      event.preventDefault();
      console.warn("WebGL Context Lost.");
      setIsContextLost(true);
    };

    const handleContextRestored = () => {
      console.log("WebGL Context Restored. Re-initializing scene.");
      setIsContextLost(false);
      // Changing the key will force the Canvas component to unmount and remount
      setRemountKey(Date.now());
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);


  // Scene configuration

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas
        key={remountKey} // This key is crucial for re-initialization
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(160deg, #08003DC0, #001D27FF, #000000FF)',
        }}
      >
        <AnimatedCamera />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <Stars
          radius={40}
          depth={80}
          count={8000}
          factor={5}
          saturation={0.8}
          fade
          speed={1}
        />
  <OrbitControls enableZoom={false} autoRotate={false} />
      </Canvas>
      {isContextLost && (
          <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100,
              fontFamily: 'sans-serif',
          }}>
              <p>3D background context lost. Attempting to restore...</p>
          </div>
      )}
    </div>
  );
};

export default Scene3D;