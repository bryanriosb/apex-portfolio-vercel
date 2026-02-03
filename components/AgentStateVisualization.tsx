'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type AgentState = 'idle' | 'thinking' | 'speaking'

interface AgentStateVisualizationProps {
  state?: AgentState
  width?: number
  height?: number
  className?: string
}

export default function AgentStateVisualization({
  state = 'idle',
  width = 160,
  height = 80,
  className = '',
}: AgentStateVisualizationProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [currentState, setCurrentState] = useState<AgentState>(state)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    group: THREE.Group
    mesh: THREE.Mesh
    ringcover: THREE.Mesh
    ring: THREE.Mesh
    hexagon: THREE.Line
    dataNodes: THREE.Mesh[]
    time: number
    rotatevalue: number
    acceleration: number
    animationId: number | null
    lastFrameTime: number
  } | null>(null)

  useEffect(() => {
    setCurrentState(state)
  }, [state])

  useEffect(() => {
    if (!wrapRef.current) return

    const length = 30
    const radius = 5.6
    let rotatevalue = 0.005
    const acceleration = 0
    const pi2 = Math.PI * 2
    let time = 0
    const group = new THREE.Group()
    const dataNodes: THREE.Mesh[] = []

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    const isLowEnd =
      isMobile &&
      ((navigator as any).hardwareConcurrency <= 4 ||
        (navigator as any).deviceMemory <= 2)

    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(65, aspect, 1, 10000)
    camera.position.z = 80
    const scene = new THREE.Scene()
    scene.add(group)

    // @ts-ignore - Three.js Curve constructor is protected but works at runtime
    class CustomCurve extends THREE.Curve<THREE.Vector3> {
      override getPoint(t: number): THREE.Vector3 {
        const percent = t
        const x = length * Math.sin(pi2 * percent)
        const y = radius * Math.cos(pi2 * 3 * percent)
        let tMod = (percent % 0.25) / 0.25
        tMod =
          (percent % 0.25) -
          (2 * (1 - tMod) * tMod * -0.0185 + tMod * tMod * 0.25)
        if (
          Math.floor(percent / 0.25) == 0 ||
          Math.floor(percent / 0.25) == 2
        ) {
          tMod *= -1
        }
        const z = radius * Math.sin(pi2 * 2 * (percent - tMod))
        return new THREE.Vector3(x, y, z)
      }
    }
    // @ts-ignore
    const customCurve = new CustomCurve()

    const tubeSegments = isLowEnd ? 120 : isMobile ? 150 : 200
    const tubeRadialSegments = isLowEnd ? 6 : isMobile ? 7 : 8

    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        customCurve,
        tubeSegments,
        1.1,
        tubeRadialSegments,
        true
      ),
      new THREE.MeshBasicMaterial({ color: 0xf4454a })
    )
    group.add(mesh)

    const nodeCount = 3
    const sphereSegments = isLowEnd ? 10 : isMobile ? 12 : 16

    for (let i = 0; i < nodeCount; i++) {
      const geometry = new THREE.SphereGeometry(
        2.2,
        sphereSegments,
        sphereSegments
      )
      const material = new THREE.MeshBasicMaterial({
        color: 0xf4454a,
        transparent: false,
        opacity: 1,
      })
      const node = new THREE.Mesh(geometry, material)
      node.userData = {
        progress: i / nodeCount,
        speed: 0.003,
        index: i,
        baseY: 0,
        targetY: 0,
        phase: i * 0.8,
      }
      dataNodes.push(node)
      group.add(node)
    }

    const ringcover = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 15, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0,
        transparent: true,
      })
    )
    ringcover.position.x = length + 1
    ringcover.rotation.y = Math.PI / 2
    group.add(ringcover)

    const ringSegments = isLowEnd ? 20 : isMobile ? 24 : 32
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 5.55, ringSegments),
      new THREE.MeshBasicMaterial({
        color: 0xf4454a,
        opacity: 0,
        transparent: true,
      })
    )
    ring.position.x = length + 1.1
    ring.rotation.y = Math.PI / 2
    group.add(ring)

    const hexPoints = []
    const hexSize = 5
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2
      hexPoints.push(
        new THREE.Vector3(
          0,
          Math.cos(angle) * hexSize,
          Math.sin(angle) * hexSize
        )
      )
    }
    const hexGeometry = new THREE.BufferGeometry().setFromPoints(hexPoints)
    const hexagon = new THREE.Line(
      hexGeometry,
      new THREE.LineBasicMaterial({
        color: 0xf4454a,
        transparent: true,
        opacity: 0,
        linewidth: 2,
      })
    )
    hexagon.position.x = length + 1.1
    hexagon.rotation.y = Math.PI / 2
    group.add(hexagon)

    const useAntialias = !isLowEnd
    const pixelRatio = isLowEnd ? 1 : isMobile ? 1.5 : 2

    const renderer = new THREE.WebGLRenderer({
      antialias: useAntialias,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: true,
    })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    wrapRef.current.appendChild(renderer.domElement)

    const targetFPS = isLowEnd ? 30 : isMobile ? 45 : 60
    const minFrameTime = 1000 / targetFPS
    let lastFrameTime = 0

    const updateDataNodes = (state: AgentState) => {
      dataNodes.forEach((node, i) => {
        if (state === 'speaking') {
          const timePhase = time * 0.12 + node.userData.phase
          const wave = Math.sin(timePhase) * 15
          const randomVariation = Math.sin(time * 0.2 + i * 1.5) * 8
          node.userData.targetY = wave + randomVariation
          node.userData.baseY +=
            (node.userData.targetY - node.userData.baseY) * 0.15

          const spacing = 18
          node.position.set(-spacing + i * spacing, node.userData.baseY, 0)
        } else {
          node.userData.progress += node.userData.speed
          if (node.userData.progress > 1) node.userData.progress = 0

          const point = customCurve.getPoint(node.userData.progress)
          node.position.copy(point)

          if (state === 'thinking') {
            node.userData.speed = 0.006
          } else {
            node.userData.speed = 0.003
          }
        }
      })
    }

    const render = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime

      if (elapsed < minFrameTime) {
        return false
      }

      lastFrameTime = currentTime
      updateDataNodes(currentState)
      renderer.render(scene, camera)
      return true
    }

    const animate = (currentTime: number) => {
      const animationId = requestAnimationFrame(animate)
      sceneRef.current!.animationId = animationId

      mesh.rotation.x +=
        sceneRef.current!.rotatevalue + sceneRef.current!.acceleration
      time++

      render(currentTime)
    }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      group,
      mesh,
      ringcover,
      ring,
      hexagon,
      dataNodes,
      time,
      rotatevalue,
      acceleration,
      animationId: null,
      lastFrameTime,
    }

    animate(0)

    const handleResize = () => {
      const newWidth = Math.min(window.innerWidth, width)
      const newHeight = Math.min(window.innerHeight, height)
      const newAspect = newWidth / newHeight
      camera.aspect = newAspect
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)

      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }

      scene.traverse((object: any) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) object.material.dispose()
      })
      renderer.dispose()

      if (
        wrapRef.current &&
        renderer.domElement.parentNode === wrapRef.current
      ) {
        wrapRef.current.removeChild(renderer.domElement)
      }
    }
  }, [width, height])

  useEffect(() => {
    if (!sceneRef.current) return

    const { group, mesh, ringcover, ring, hexagon, dataNodes } =
      sceneRef.current

    group.rotation.y = 0
    group.position.z = 0
    ;(mesh.material as THREE.MeshBasicMaterial).opacity = 1
    ;(ringcover.material as THREE.MeshBasicMaterial).opacity = 0
    ;(ring.material as THREE.MeshBasicMaterial).opacity = 0
    ;(hexagon.material as THREE.LineBasicMaterial).opacity = 0

    dataNodes.forEach((node, i) => {
      node.userData.baseY = 0
      node.userData.progress = i / dataNodes.length
    })

    if (currentState === 'idle') {
      sceneRef.current.rotatevalue = 0.005
    } else if (currentState === 'thinking') {
      sceneRef.current.rotatevalue = 0.2
    } else if (currentState === 'speaking') {
      sceneRef.current.rotatevalue = 0.07
    }
  }, [currentState])

  return (
    <div
      ref={wrapRef}
      className={`inline-block ${className}`}
      style={{ width, height }}
    />
  )
}
