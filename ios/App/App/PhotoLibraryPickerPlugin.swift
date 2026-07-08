import Capacitor
import PhotosUI
import UIKit

@objc(PhotoLibraryPickerPlugin)
public class PhotoLibraryPickerPlugin: CAPPlugin, CAPBridgedPlugin, PHPickerViewControllerDelegate {
    public let identifier = "PhotoLibraryPickerPlugin"
    public let jsName = "PhotoLibraryPicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickImage", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?

    @objc func pickImage(_ call: CAPPluginCall) {
        if activeCall != nil {
            call.reject("Photo library picker is already open.")
            return
        }

        DispatchQueue.main.async {
            var configuration = PHPickerConfiguration(photoLibrary: .shared())
            configuration.filter = .images
            configuration.selectionLimit = 1
            configuration.preferredAssetRepresentationMode = .current

            let picker = PHPickerViewController(configuration: configuration)
            picker.delegate = self
            self.activeCall = call

            guard let presenter = self.bridge?.viewController else {
                self.activeCall = nil
                call.reject("Unable to present photo library picker.")
                return
            }
            presenter.present(picker, animated: true)
        }
    }

    public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)

        guard let call = activeCall else {
            return
        }
        activeCall = nil

        guard let provider = results.first?.itemProvider else {
            call.resolve(["cancelled": true])
            return
        }

        guard provider.canLoadObject(ofClass: UIImage.self) else {
            call.reject("Selected item is not an image.")
            return
        }

        provider.loadObject(ofClass: UIImage.self) { object, error in
            if let error = error {
                DispatchQueue.main.async {
                    call.reject("Unable to load selected image: \(error.localizedDescription)")
                }
                return
            }
            guard let image = object as? UIImage else {
                DispatchQueue.main.async {
                    call.reject("Unable to decode selected image.")
                }
                return
            }

            let normalized = image.gridCrownNormalizedImage(maxSide: 1600)
            guard let data = normalized.jpegData(compressionQuality: 0.88) else {
                DispatchQueue.main.async {
                    call.reject("Unable to encode selected image.")
                }
                return
            }

            let base64 = data.base64EncodedString()
            DispatchQueue.main.async {
                call.resolve([
                    "cancelled": false,
                    "mimeType": "image/jpeg",
                    "dataUrl": "data:image/jpeg;base64,\(base64)"
                ])
            }
        }
    }
}

private extension UIImage {
    func gridCrownNormalizedImage(maxSide: CGFloat) -> UIImage {
        let width = max(1, size.width)
        let height = max(1, size.height)
        let scaleFactor = min(1, maxSide / max(width, height))
        let targetSize = CGSize(width: floor(width * scaleFactor), height: floor(height * scaleFactor))

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        return renderer.image { context in
            UIColor.black.setFill()
            context.fill(CGRect(origin: .zero, size: targetSize))
            draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }
}
