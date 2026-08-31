import SwiftUI

/// Shown once before pairing when the server has child-app terms configured
/// (Admin panel → App Settings). When no terms are set the screen never appears.
struct TermsView: View {
    let text: String
    let onAccepted: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("Terms of Service")
                .font(.title3.bold())
                .padding(.top, 28)
                .padding(.bottom, 12)

            ScrollView {
                Text(text)
                    .font(.footnote)
                    .foregroundColor(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
            }
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .padding(.horizontal, 16)

            Button(action: {
                PrefsManager.shared.termsAccepted = true
                onAccepted()
            }) {
                Text("I accept")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Color("Primary")).foregroundColor(.white).cornerRadius(16)
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
    }
}
