
const map = new WeakMap()
const ob = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const handler = map.get(entry.target)
        if (handler) {
            const [box] = entry.borderBoxSize
            handler({
                width: box.inlineSize,
                height: box.blockSize
            })
        }

    }
})
const vSizeOb = {
    mounted: (el, binding) => {
        ob.observe(el)
        map.set(el, binding.value)
    },
    unmounted: (el) => {
        ob.unobserve(el)
        map.delete(el)
    }
}

export default vSizeOb
